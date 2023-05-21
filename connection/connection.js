var amqp = require('amqplib/callback_api')

module.exports = (callback) => {
  amqp.connect('amqp://localhost:5672/messages',
    {
      timeout: 2000
    },
    (error, conection) => {
    if (error) {
      throw new Error(error);
    }

    callback(conection);
  })
}