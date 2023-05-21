var amqp = require('amqplib/callback_api')


module.exports = (callback) => {
  const {AMQP_HOST, AMQP_PORT, AMQP_ROUTE } = process.env;
  amqp.connect(`${AMQP_HOST}:${AMQP_PORT}`,
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