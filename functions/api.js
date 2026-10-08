/**
 * CLOUDFLARE PAGES FUNCTIONS (Tự động chạy khi deploy qua Git lên Cloudflare Pages)
 * Route: /api
 */

const ACTIVE_CODES_KEY = "codes:active";

async function readActiveCodes(kv) {
  const raw = await kv.get(ACTIVE_CODES_KEY);
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.map((c) => String(c).trim().toUpperCase()).filter(Boolean))];
      }
    } catch {}
    return [];
  }

  const migrated = [];
  let cursor;
  do {
    const list = await kv.list({ prefix: "code:", cursor });
    for (const item of list.keys) {
      const code = item.name.replace(/^code:/, "").trim().toUpperCase();
      if (code) migrated.push(code);
    }
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  const unique = [...new Set(migrated)];
  await kv.put(ACTIVE_CODES_KEY, JSON.stringify(unique));
  return unique;
}

async function writeActiveCodes(kv, codes) {
  const unique = [...new Set(codes.map((c) => String(c).trim().toUpperCase()).filter(Boolean))];
  await kv.put(ACTIVE_CODES_KEY, JSON.stringify(unique));
  return unique;
}

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const MASTER_CODES = ["MM88VIP", "MM88MASTER", "ADMIN88"];

  // 1. GET: Lấy danh sách mã còn hiệu lực
  if (request.method === "GET") {
    try {
      if (!env.CODES_KV) {
        return new Response(JSON.stringify(MASTER_CODES), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const codes = await readActiveCodes(env.CODES_KV);
      return new Response(JSON.stringify(codes), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  // 2. POST: Thêm / Xóa / Xác thực mã dùng 1 lần
  if (request.method === "POST") {
    try {
      let body = {};
      const text = await request.text();
      try { body = JSON.parse(text); } catch {}

      const action = body.action || url.searchParams.get("action");
      const code = (body.code || url.searchParams.get("code") || "").trim().toUpperCase();

      if (!code) {
        return new Response(JSON.stringify({ success: false, message: "Mã không được để trống" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (!env.CODES_KV) {
        if (action === "verify_and_delete" || action === "check") {
          if (MASTER_CODES.includes(code)) {
            return new Response(JSON.stringify({ success: true, valid: true, message: "Mã Master hợp lệ" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }
        return new Response(JSON.stringify({ 
          success: false, 
          message: "Chưa gắn binding KV CODES_KV trong Settings > Functions" 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const key = `code:${code}`;

      // Thêm mã mới (Kiểm tra trùng lặp)
      if (action === "add") {
        if (MASTER_CODES.includes(code)) {
          return new Response(JSON.stringify({ 
            success: false, 
            duplicate: true, 
            message: `Mã [${code}] là Master Code cố định của hệ thống, không cần thêm lại!` 
          }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const codes = await readActiveCodes(env.CODES_KV);
        if (codes.includes(code)) {
          return new Response(JSON.stringify({ 
            success: false, 
            duplicate: true, 
            message: `Mã [${code}] đã tồn tại trong danh sách chờ sử dụng!` 
          }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        await writeActiveCodes(env.CODES_KV, [...codes, code]);
        await env.CODES_KV.put(key, JSON.stringify({ createdAt: new Date().toISOString(), once: true }));
        return new Response(JSON.stringify({ success: true, message: `Đã thêm mã [${code}] thành công!` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Xóa mã
      if (action === "delete") {
        const codes = await readActiveCodes(env.CODES_KV);
        await writeActiveCodes(env.CODES_KV, codes.filter((c) => c !== code));
        await env.CODES_KV.delete(key);
        return new Response(JSON.stringify({ success: true, message: `Đã xóa mã [${code}]` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Xác thực và tự hủy mã dùng 1 lần
      if (action === "verify_and_delete" || action === "check") {
        if (MASTER_CODES.includes(code)) {
          return new Response(JSON.stringify({ 
            success: true, 
            valid: true, 
            isMaster: true,
            message: "Mã Master hợp lệ" 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const codes = await readActiveCodes(env.CODES_KV);
        const legacy = await env.CODES_KV.get(key);
        if (codes.includes(code) || legacy !== null) {
          await writeActiveCodes(env.CODES_KV, codes.filter((c) => c !== code));
          await env.CODES_KV.delete(key);
          return new Response(JSON.stringify({ 
            success: true, 
            valid: true, 
            message: "Mã hợp lệ và đã kích hoạt" 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } else {
          return new Response(JSON.stringify({ 
            success: false, 
            valid: false, 
            message: "Mã không tồn tại hoặc đã được sử dụng trước đó" 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      return new Response(JSON.stringify({ error: "Action không hợp lệ" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
}
