/**
 * CLOUDFLARE PAGES / WORKERS _worker.js
 * Tự động chạy khi deploy qua Git lên Cloudflare Pages
 * Định tuyến: /api -> Database KV, tất cả trang khác -> Static Files (index.html, admin/...)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname.toLowerCase().replace(/\/$/, "");

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // XỬ LÝ TẤT CẢ REQUEST /api
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      // 1. GET: Lấy danh sách mã
      if (request.method === "GET") {
        try {
          if (!env.CODES_KV) {
            return new Response(JSON.stringify([]), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          const list = await env.CODES_KV.list({ prefix: "code:" });
          const codes = list.keys.map(k => k.name.replace(/^code:/, ""));
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

      // 2. POST: Thêm, Xóa, Xác thực & Tự hủy mã
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
            return new Response(JSON.stringify({ 
              success: false, 
              message: "Chưa gắn KV binding CODES_KV trong Cloudflare Pages Settings -> Functions" 
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          const key = `code:${code}`;

          // Thêm mã
          if (action === "add") {
            await env.CODES_KV.put(key, JSON.stringify({ createdAt: new Date().toISOString() }));
            return new Response(JSON.stringify({ success: true, message: `Đã thêm mã ${code}` }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Xóa mã
          if (action === "delete") {
            await env.CODES_KV.delete(key);
            return new Response(JSON.stringify({ success: true, message: `Đã xóa mã ${code}` }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Xác thực & Hủy mã 1 lần
          if (action === "verify_and_delete" || action === "check") {
            const existing = await env.CODES_KV.get(key);
            if (existing !== null) {
              await env.CODES_KV.delete(key);
              return new Response(JSON.stringify({ success: true, valid: true, message: "Mã hợp lệ" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            } else {
              return new Response(JSON.stringify({ success: false, valid: false, message: "Mã không tồn tại hoặc đã sử dụng" }), {
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
    }

    // NẾU LÀ TRANG WEB TĨNH (HTML, CSS, JS): Chuyển tiếp cho Cloudflare Pages Static Assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};
