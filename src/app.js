var Fastify = require("../fastify");

Fastify.createHelper('isShow', function(value) {
    var style = 'style="display: ' + (value ? 'block' : 'none') + '"';
    return Fastify.SafeString(style);
});


Fastify.createClass('App', {
    getInitialState: function() {
        return {
            items: ['WAGNER', 'Mayara', 'tiago', 'teste']
        }
    },

    handleSubmit: function(e) {
        e.preventDefault();

        if (document.querySelector('#teste').value === '') {
            this.setState({
                error: true
            });
            return false;
        }

        var items = this.state.items;
        var nextItems = items.concat([document.querySelector('#teste').value]);

        this.setState({
            items: nextItems,
            error: false
        });
    },

    removeTodos: function(e, index) {
        e.preventDefault();
        var items = this.state.items;
        items.splice(index, 1);
        this.setState({
            items: items
        });
    },

    render: function() {
        return `<form {{ onSubmit handleSubmit=handleSubmit }}>
                    <div {{ isShow this.state.error }}>Enter a value</div>
                    <input id="teste" />
                    <button>Add # {{ this.state.items.length }}</button>
                    {{ List items=state.items removeTodos=this.removeTodos }}
                </form> 
                `;
    }

});

Fastify.createClass('List', {
    uppercase: function(value) {
        return value.toLowerCase();
    },
    render: function() {

        return `
            <div>
                <ul>{{#each props.items}} <li> {{ this }} - <button type="button" {{ onClick removeTodo=../props.removeTodos id=@index }}>delete {{@key}}</button></li> {{/each}}</ul>
            </div>
        `;
    }
});

Fastify.bootstrap('App', document.querySelector('#app'));
