const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const localtunnel = require('localtunnel');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ===== In-memory order store =====
const orders = [];

// ===== Socket.IO =====
io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // Send existing orders to newly connected client
  socket.emit('orders:init', orders);

  // Handle new order from 小九
  socket.on('order:new', (order, ack) => {
    const enriched = {
      ...order,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      receivedAt: new Date().toISOString()
    };
    orders.push(enriched);
    console.log(`[order] ${enriched.id} — ${order.items?.length || 0} items`);

    // Broadcast to all connected clients (including 舟舟)
    io.emit('order:incoming', enriched);

    if (ack) ack({ ok: true, id: enriched.id });
  });

  // Handle clear orders (from 舟舟)
  socket.on('orders:clear', () => {
    orders.length = 0;
    io.emit('orders:cleared');
    console.log('[orders] cleared');
  });

  // Handle refresh request from 舟舟
  socket.on('orders:list', () => {
    socket.emit('orders:init', orders);
    console.log(`[orders:list] sent ${orders.length} orders to ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`\n  💝 Love Order Server`);
  console.log(`  ═════════════════════`);
  console.log(`  小九点单: http://localhost:${PORT}`);
  console.log(`  舟舟收件: http://localhost:${PORT}/zhouzhou.html`);

  // Show LAN URLs (for same Wi-Fi access)
  console.log(`\n  🌐 同一网络（局域网）:`);
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`    http://${iface.address}:${PORT}`);
        console.log(`    http://${iface.address}:${PORT}/zhouzhou.html`);
      }
    }
  }

  // Create public tunnel via localtunnel (no account needed)
  console.log(`\n  🔗 启动公网隧道...`);
  try {
    const tunnel = await localtunnel({ port: PORT });
    console.log(`\n  🌍 公网地址（任何网络都可访问）:`);
    console.log(`     小九点单: ${tunnel.url}`);
    console.log(`     舟舟收件: ${tunnel.url}/zhouzhou.html`);
    console.log(`  ⚠️  每次重启服务器地址会变化，请用这个地址在手机上打开`);

    tunnel.on('error', (err) => {
      console.log('  ⚠️  隧道连接异常:', err.message);
    });
    tunnel.on('close', () => {
      console.log('  ⚠️  隧道已关闭');
    });
  } catch (e) {
    console.log(`  ⚠️  公网隧道创建失败 (${e.message})`);
    console.log(`     仅限同一 Wi-Fi 网络使用`);
  }

  console.log(`\n`);
});
