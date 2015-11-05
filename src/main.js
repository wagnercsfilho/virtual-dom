var h = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var createElement = require('virtual-dom/create-element');
var dom2hscript = require("dom2hscript");
var Handlebars = require('handlebars');
var $ = require('zepto-browserify').$;
var clone = require('clone');
var WatchJS = require("watchjs");

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

            // render inner components
            /*if (component.inject) {
                component.inject.forEach(function(selector) {

                    var pattern = new RegExp('<' + selector + '>(.*?)<\/' + selector + '>', 'g');
                    var test = pattern.test(self.selectors[component.selector].render);

                    if (test) {
                        renderComponent = self.selectors[component.selector].render.replace(pattern, self.selectors[selector].render);
                    }
                });
            }
            if (renderComponent) self.selectors[component.selector].render = renderComponent;*/

            //init component controller
            if (component.controller) {
                if (!self.selectors[component.selector].controllerInstance)
                    self.selectors[component.selector].controllerInstance = new component.controller();

                if (!component.observer) {
                    WatchJS.watch(self.selectors[component.selector].controllerInstance, function() {
                        for (var component in self.selectors) {
                            self.createComponent(self.selectors[component]);
                        }
                        self.render(self.selectors[self.rootComponent.selector]);
                    });
                    component.observer = true;
                }
            }
            else {
                // create empty controller
                self.selectors[component.selector].controllerInstance = {};
            }

            // parse template
            renderComponent = self.selectors[component.selector].render = renderAttributes.call(self, self.selectors[component.selector].template(), self.selectors[component.selector].controllerInstance);

            //register helper
            Handlebars.registerHelper(component.selector, function() {
                console.log(this)
                var args = arguments;
                var options = args[args.length - 1];
                var data = options.data.root;
                var controller = self.selectors[options.name].controllerInstance;
                if (options.fn) {
                    controller.child = options.fn(this);
                }
                for (var attr in options.hash) {
                    controller[attr] = options.hash[attr];
                }
                console.log(controller);

                renderComponent = self.selectors[component.selector].render = renderAttributes.call(self, self.selectors[component.selector].template(), self.selectors[component.selector].controllerInstance);
                return new Handlebars.SafeString(renderComponent);
            });

            //create virtual dom
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

var TodoInput = PhonePack.createComponent({
    selector: 'TodoInput',
    template: function() {
        return '<div><input value="{{people}}" /> {{people}} </div>';
    }
})

var App = PhonePack.createComponent({
    inject: ['TodoInput'],
    selector: 'App',
    template: function() {
        return '<div><div> Hello {{name}}</div> {{#each peoples}} {{TodoInput people=this}} {{/each}} </div>';
    },
    controller: function() {
        var self = this;
        self.peoples = ['wagner', 'tiago'];
        self.name = 'wagner ';

        setInterval(function() {
            console.log(self.peoples);
            self.peoples.push('mayara');
        }, 2000);

    }
});



PhonePack.render(App, document.body);