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
            <input type="text" value="{{ props.todo }}" {{ onChange changeTodo=props.changeTodo }} /> 
            <button {{ onClick addTodo=props.addTodo }}>Add Todo</button>
            `;
    }
});

fastify.createComponent({
    selector: 'TodoItem', 
    template: function(){
        return `
            <li>
                {{ props.todo.name }} - {{ status props.todo.done }} 
                <button {{ onClick doneTodo=props.doneTodo todo=props.todo }}>
                    {{#if props.todo.done }}
                        Not Done!
                    {{else}}
                        Done!
                    {{/if}}
                </button>
            </li>
            `;
    }
});

fastify.createComponent({
    selector: 'CountryList',
    template: function(){
        return (`<div>
                <input type="text" {{ onChange filterCountry=filterCountry }} />
                <ul class="countries">{{#each countries}}<li>{{ name }}</li>{{/each}}</ul> 
                </div>
            `);
    },
    controller: function(){
        var self = this;
        self.countries = [];
        
        fastify.$.get('https://restcountries.eu/rest/v1/all', function(data){
            self.countries = data;
            self.oldCountries = data;
        });
        
        self.filterCountry = function(e){
            self.countries = self.oldCountries.filter(function(value){
                if (e.target.value === '') return true;
                var rg = new RegExp(e.target.value, 'g');
                return value.name.search(rg) > -1; 
            });
        }
        
        self.componentDidMount = function(){
            fastify.$('.countries').css('background', '#ebebeb');
        }
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
                        {{ TodoItem todo=this doneTodo=../doneTodo key=@index }} 
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
        
        self.doneTodo = function (e, todo) {
            todo.done = !todo.done ;
        }
        
    }
});

fastify.render('App', document.querySelector('#app'));
fastify.render('CountryList', document.querySelector('#list'));