var amqp = require('amqplib/callback_api')


module.exports = (callback) => {
  const {AMQP_HOST } = process.env;
  amqp.connect(`${AMQP_HOST}?heartbeat=60`,
    {
      timeout: 2000,
    },
    (error, conection) => {
    if (error) {
      throw new Error(error);
    }

    callback(conection);
  })
}