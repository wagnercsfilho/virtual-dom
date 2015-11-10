var Fastify = require("../fastify");

require("./controllers/App");

Fastify.render('App', document.querySelector('#app'));
