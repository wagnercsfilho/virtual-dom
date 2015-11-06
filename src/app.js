var fastify = require("../fastify");

fastify.createHelper('status', function(done){
    if (done){
        return 'Done!'
    } else {
        return 'Not';
    }
});

fastify.createComponent({
    selector: 'TodoInput',
    template: function() {
        return `
            <input type="text" value="{{ props.todo }}" {{ onchange changeTodo=props.changeTodo }} /> 
            <button {{ onclick addTodo=props.addTodo }}>Add Todo</button>
            `;
    }
});

fastify.createComponent({
    selector: 'TodoItem', 
    template: function(){
        return '<li>{{ props.todo.name }} - {{ status props.todo.done }} <button {{ onclick doneTodo=props.doneTodo index=props.index }}>Done</button></li>'
    }
});

fastify.createComponent({
    selector: 'App',
    template: function() {
        return (
            `<div> 
                <h2> Wellcome {{ user.name }} </h2>
                {{ TodoInput changeTodo=changeTodo addTodo=addTodo todo=todo }}
                <ul>
                    {{#each todos }} 
                        {{ TodoItem todo=this doneTodo=../doneTodo index=@index }} 
                    {{/each}}
                </ul>
            </div>`
        );
    },
    controller: function() {
        var self = this;
        self.todo = '';
        self.todos = [
            {name: 'Clean the Car', done: false}, 
            {name: 'Learn English', done: false},
            {name: 'Pay the bills', done: false}
        ];
        self.user = {
            id: 1,
            name: 'Wagner CS Filho '
        };
        
        self.changeTodo = function (e) {
            self.todo = e.target.value;
        }
        
        self.addTodo = function(){
            self.todos.push({ name: self.todo, done: false });
        }
        
        self.doneTodo = function (e, index) {
            self.todos[3].done = true;
        }
        
    }
});

fastify.render('App', document.body, function(){
    console.log('run')
});