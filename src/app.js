var fastify = require("../fastify");

fastify.createComponent({
    selector: 'TodoInput',
    template: function() {
        return '<input type="text" {{ model todo=props.todo }} /><a {{ click props.addTodo }} > Add Todo</a>';
    }
});

fastify.createComponent({
    selector: 'TodoItem', 
    template: function(){
        return '<li>{{ props.todo }}</li>'
    }
})

fastify.createComponent({
    selector: 'App',
    template: function() {
        return (
            `<div> 
                <h2> Wellcome {{ user.name }} </h2>
                {{ TodoInput parent=this addTodo=addTodo todo=todo }}
                <ul>
                    {{#each todos }} 
                        {{ TodoItem todo=this }} 
                    {{/each}}
                </ul>
            </div>`
        );
    },
    controller: function() {
        var self = this;
        self.todo = 'New Todo';
        self.todos = [
            'Clean the Car', 
            'Learn English', 
            'Pay the bills'
        ];
        self.user = {
            id: 1,
            name: 'Wagner CS Filho '
        };
        
        self.addTodo = function(){
            self.todos.push('Learn React');
        }
        
    }
});

fastify.render('App', document.body);