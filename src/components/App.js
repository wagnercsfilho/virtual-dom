'use strict';

var Fastify = require("../../fastify");

class App extends Fastify.Class{
    
    constructor(){
        super();
        this.selector = 'App';
        this.render('<h1>Hello</h1>');
    }
    
}
var app = new App();
app.initialize();

module.exports = app;