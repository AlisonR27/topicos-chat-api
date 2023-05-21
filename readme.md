# Topicos-chat-api
## _A API de um chat ruim, é sério. É só isso._

Para rodar o projeto localmente, use: 
```npm install; node app.js```
A configuração do rabbitmq deve ser feita num arquivo.env, contendo (default):

```env
    API_PORT=5555
    AMQP_HOST=amqp://localhost
    AMQP_PORT=5672
    AMQP_ROUTE=messages
```