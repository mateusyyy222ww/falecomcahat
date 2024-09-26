const { WebSocketServer } = require("ws");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

// Conectar ao banco de dados MongoDB
mongoose.connect('mongodb://localhost/chatdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Definir o esquema e modelo da mensagem
const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Configurar o servidor WebSocket
const wss = new WebSocketServer({ port: process.env.PORT || 8080 });

wss.on("connection", (ws) => {
  console.log("Cliente conectado");

  // Enviar mensagens antigas para o novo cliente conectado
  Message.find().then(messages => {
    messages.forEach(message => {
      ws.send(JSON.stringify({
        username: message.username,
        message: message.message,
        timestamp: message.timestamp
      }));
    });
  }).catch(err => console.error('Erro ao buscar mensagens:', err));

  // Receber e salvar novas mensagens
  ws.on("message", (data) => {
    const messageData = JSON.parse(data); // Parse da mensagem recebida

    // Criar uma nova mensagem e salvar no banco de dados
    const newMessage = new Message({
      username: messageData.username,
      message: messageData.message,
    });

    newMessage.save()
      .then(() => {
        // Enviar a mensagem para todos os clientes conectados
        wss.clients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({
              username: messageData.username,
              message: messageData.message,
              timestamp: newMessage.timestamp
            }));
          }
        });
      })
      .catch(err => console.error('Erro ao salvar a mensagem:', err));
  });

  // Tratar erros de WebSocket
  ws.on("error", console.error);
});

console.log(`Servidor WebSocket rodando na porta ${process.env.PORT || 8080}`);
