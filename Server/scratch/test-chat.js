require('dotenv').config();
const { chatSupport } = require('../controllers/chatController');

async function test() {
  const req = {
    body: {
      messages: [
        { sender: "user", text: "how to create quiz" }
      ]
    },
    user: {
      role: "admin"
    }
  };
  const res = {
    json: (data) => console.log("JSON:", JSON.stringify(data, null, 2)),
    status: (code) => {
      console.log("STATUS:", code);
      return { json: (data) => console.log("JSON:", JSON.stringify(data, null, 2)) };
    }
  };

  await chatSupport(req, res);
}

test();
