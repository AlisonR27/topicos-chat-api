var express = require('express') 
var bodyParser = require('body-parser')
var rabbitMQHandler = require('./connection')
var cors = require('cors');

const fs = require('fs')
var app = express()
var router = express.Router()
var server = require('http').Server(app) 

var socketIO = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

var outputSocket = socketIO.of('/msg')

const userFile = './db/users.json'
const chatFile = './db/chats.json'

require('dotenv').config()

if(!fs.existsSync(userFile)) {
  fs.writeFileSync(userFile, '[]', () => {
  });
}

if(!fs.existsSync(chatFile)) {
  fs.writeFileSync(chatFile, '[]', () => {
  });
}

// Pegar um chat especifico 
const currentChatIndex = (id) => {
  const chats = JSON.parse(fs.readFileSync(chatFile));
  const curr_chat = chats.find(chat => chat.id == id);
  
  return chats.indexOf(curr_chat);
}

const getChats = () => {
  return JSON.parse(fs.readFileSync(chatFile));
}

// Test handler 
rabbitMQHandler((connection) => {
  connection.createChannel((err, channel) => {
    if (err) {
      throw new Error(err);
    }
    var mainQueue = 'messages'

    channel.assertQueue(mainQueue, {},(err, queue) => {
      if (err) {
        throw new Error(err)
      }
      channel.bindQueue(queue.queue, 'amq.topic', 'chat.*')
      channel.consume(queue.queue, (msg) => {
        console.log(`message.${msg.fields.routingKey}`)
        outputSocket.emit(`message.${msg.fields.routingKey}`, JSON.stringify(JSON.parse(msg.content)))
      })
    }, {noAck: true})
  })
})

app.use(cors());
// app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());
// app.use(function (req, res, next) {

//   // // Website you wish to allow to connect
//   res.setHeader('Access-Control-Allow-Origin', '*');

//   // Request methods you wish to allow
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

//   // Request headers you wish to allow
//   // res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
//   res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Access-Control-Allow-Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");

//   // Set to true if you need the website to include cookies in the requests sent
//   // to the API (e.g. in case you use sessions)
//   res.setHeader('Access-Control-Allow-Credentials', true);
//   if (req.method === 'OPTIONS') res.sendStatus(200);
  
//   // Pass to next layer of middleware
//   next();
// });
app.use('/api', router)


// Rota de registro
router.route('/register').post((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Lê o arquivo JSON de usuários
  const users = JSON.parse(fs.readFileSync(userFile));

  // Verifica se o usuário já existe
  if (users.find(user => user.email === req.body.email)) {
    return res.status(409).json({ error: 'Usuário já existe' });
  }

  console.log(req.body)
  // Adiciona o novo usuário ao array
  users.push({
    name: req.body.name,
    email: req.body.email,
    pass: req.body.pass
  });
  console.log('Users', users);

  // Salva o array de usuários no arquivo JSON
  fs.writeFileSync(userFile, JSON.stringify(users));

  // Retorna a resposta de sucesso
  res.status(201).json({ message: 'Usuário criado com sucesso' });
});


// Rota de login
router.route('/login').post((req, res) => {
  // Lê o arquivo JSON de usuários
  const users = JSON.parse(fs.readFileSync(userFile));
  console.log(users)

  // Busca o usuário pelo username e password
  const user = users.find(u => {
    return u.email === req.body.email && u.pass === req.body.pass
  });

  
  // Verifica se o usuário foi encontrado
  if (!user) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }

  // Retorna a resposta de sucesso
  res.status(200).json({email: user.email, name: user.name});
});

router.route('/users').get(function(req,res) {
  const users = JSON.parse(fs.readFileSync(userFile));

  users.forEach(user => {
    delete user.pass
  })

  res.status(200).json(users);
});

router.route('/chats/new').post((req,res) => {
  try {
    const chats = JSON.parse(fs.readFileSync(chatFile));
    const newChat = {
      messages:[
        req.body.firstMessage
      ]
    }
    chats.push(newChat);
    res.status(200).json({message: 'Chat criado com sucesso.'});
  } catch(e) {
    return res.status(500).json({ error: 'Falha ao criar chat.'});
  }
})

// GET ALL THE CHATS
router.route('/chats').get((req,res) => {
  const chats = JSON.parse(fs.readFileSync(chatFile)).map(
    item => {
      const filtered = {
        id: item.id,
        name: item.name
      }
      return filtered
    }
  );
  res.status(200).json(chats);
})

// ADQUIRIR AS MENSAGENS QUE TEM POR CHAT
router.route('/chats/:id').get((req,res) => {
  const current = getChats()[currentChatIndex(req.params.id)];
  res.status(200).json(current)
})


// ENVIO DE MENSAGENS
router.route('/chats/:id/message').post((req,res) => {
  try {
    const chats = getChats();

    const new_msg = req.body;

    delete new_msg.chat;

    chats[currentChatIndex(req.params.id)].history.push(req.body);

    // Disparar aviso
    rabbitMQHandler(async (connection) => {
      connection.createChannel(async (err, channel) => {
        if (err) {
          console.log(err)
        }
        var mainQueue = 'messages'

        var msg = JSON.stringify(req.body);

        var result = channel.publish('amq.topic', `chat.${req.params.id}`, new Buffer.from(msg), {immediate:true}) 
        
        console.log("Result of the publish", result)
        // outputSocket.emit('messages', msg)
        channel.close(() => {connection.close()})
      })
    })

    fs.writeFileSync(chatFile, JSON.stringify(chats));
    return res.status(200).send(true);
  } catch (e) {
    return res.status(500).json(e)
  }
})

server.listen(process.env.PORT, '0.0.0.0',
  () => {
    console.log(`Running at at localhost:5555`)
  }
)