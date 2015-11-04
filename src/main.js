var h = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var createElement = require('virtual-dom/create-element');
var dom2hscript = require("dom2hscript");
var Handlebars = require('handlebars');
var $ = require('zepto-browserify').$;
var Observer = require("observe-js");
var clone = require('clone');

// 1: Create a function that declares what the DOM should look like
/*function render(count) {
    var input = h('input', {
        attributes: {
            "value": ""
        }
    }, '');
    return h('div', {}, [input, count]);
}

// 2: Initialise the document
var count = 0; // We need some app data. Here we just store a count.

var tree = render(count); // We need an initial tree
var rootNode = createElement(tree); // Create an initial root DOM node ...

document.body.appendChild(rootNode); // ... and it should be in the document

// 3: Wire up the update logic
setInterval(function() {
    count++;

    var newTree = render(count);
    var patches = diff(tree, newTree);
    rootNode = patch(rootNode, patches);
    tree = newTree;
}, 1000);*/

var PhonePack = (function() {

    function renderAttributes(template, controller) {
        var template = Handlebars.compile(template);
        var result = template(controller);
        return result;
    }

    return {

        selectors: {},

        createComponent: function(component) {
            var self = this;
            var renderComponent = '';
            var controller = null;

            self.selectors[component.selector] = component;
            self.selectors[component.selector].template = component.template;
            self.selectors[component.selector].render = component.template();

            // render inner components
            if (component.inject) {
                component.inject.forEach(function(selector) {

                    var pattern = new RegExp('<' + selector + '>(.*?)<\/' + selector + '>', 'g');
                    var test = pattern.test(self.selectors[component.selector].render);

                    if (test) {
                        renderComponent = self.selectors[component.selector].render.replace(pattern, self.selectors[selector].render);
                    }
                });
            }
            if (renderComponent) self.selectors[component.selector].render = renderComponent;

            //init component controller
            if (component.controller) {
                if (!self.selectors[component.selector].controllerInstance)
                    self.selectors[component.selector].controllerInstance = new component.controller();

                for (var attr in self.selectors[component.selector].controllerInstance) {
                    if (typeof self.selectors[component.selector].controllerInstance[attr] === 'function') {
                        Handlebars.registerHelper(attr, function(person) {
                            return new Handlebars.SafeString("(" +
                                self.selectors[component.selector].controllerInstance[attr].toString().replace(/\"/g, "'") + ")()");
                        });
                    }
                }

                if (!component.observer) {
                    var observer = new Observer.ObjectObserver(self.selectors[component.selector].controllerInstance);

                    observer.open(function(added, removed, changed, getOldValueFn) {

                        for (var component in self.selectors) {
                            self.createComponent(self.selectors[component]);
                        }

                        self.render(self.selectors[self.rootComponent.selector]);
                    });
                    component.observer = true;
                }

                self.selectors[component.selector].render = renderAttributes.call(self, self.selectors[component.selector].render, self.selectors[component.selector].controllerInstance);
            }
            console.log(dom2hscript.parseHTML(self.selectors[component.selector].render), self.selectors[component.selector].render)
            self.selectors[component.selector].tree = eval(dom2hscript.parseHTML(self.selectors[component.selector].render));
            return self.selectors[component.selector];
        },

        render: function(component, element) {
            var self = this;
            var id = 0;

            console.log(component)

            function setIds(c) {
                id++;
                if (!c.properties) c.properties = {};
                c.properties.id = id;
                if (c.children) {
                    c.children.forEach(function(child) {
                        if (child) {
                            setIds(child);
                        }
                    });
                }
            }

            if (self.rootComponent) {
                setIds(component.tree);
                var newTree = component.tree;
                var oldTree = self.rootComponent.tree;
                var patches = diff(oldTree, newTree);
                self.rootNode = patch(self.rootNode, patches);
            }
            else {
                setIds(component.tree);
                self.rootNode = createElement(component.tree);
                element.appendChild(self.rootNode);
            }

            self.rootComponent = clone(component);
        }
    };

})();

var Wellcome = PhonePack.createComponent({
    selector: 'wellcome',
    template: function() {
        return '<div> <button></button></div>'
    },
    controller: function() {
        var self = this;
    }
})

var TodoInput = PhonePack.createComponent({
    inject: ['wellcome'],
    selector: 'TodoInput',
    template: function() {
        return '<div><div><input value="{{ test }}" /> {{ test }}</div> <wellcome></wellcome> </div>';
    },
    controller: function() {
        this.test = 'input test';
    }
})

var App = PhonePack.createComponent({
    inject: ['TodoInput'],
    selector: 'App',
    template: function() {
        return '<div><div onclick="{{test}}"> Hello {{name}}</div> <TodoInput></TodoInput></div>';
    },
    controller: function() {
        var self = this;
        self.nome = 'Wagss';

        self.test = function() {
            console.log(self);
        }
    }
});



PhonePack.render(App, document.body);