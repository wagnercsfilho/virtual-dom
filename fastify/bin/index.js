var h = require('../lib/virtual-dom/h');
var diff = require('../lib/virtual-dom/diff');
var patch = require('../lib/virtual-dom/patch');
var createElement = require('../lib/virtual-dom/create-element');
var dom2hscript = require("../lib/dom2hscript");
var WatchJS = require("../lib/watchjs");

var Handlebars = require('handlebars');
var clone = require('clone');
var $ = require('zepto-browserify').$

var Fastify = (function() {

    function _parseTemplate(template, controller) {
        var template = Handlebars.compile(template.toString());
        var result = template(controller);
        return result;
    }

    function handleEvent(helper, ev) {
        Handlebars.registerHelper(helper, function() {
            var self = this;
            var args = arguments;
            var data = args[0];
            var key = '';
            var hashKeys = Object.keys(data.hash);
            var id = hashKeys[hashKeys.length - 1];
            var fn = data.hash[id];

            function handle(e) {
                var arr = hashKeys.map(function(key) {
                    return data.hash[key]
                });
                var params = [e].concat(arr.shift());
                fn.apply(this, params);
            }

            if (fn) {
                if (self.props) {
                    if (self.props.key !== undefined && self.props.key !== null) {
                        key = '_' + self.props.key;
                    }
                }
                $(document).off(ev, "#" + id + key);
                $(document).on(ev, "#" + id + key, handle);
                return new Handlebars.SafeString('id="' + id + key + '"');
            }
            else {
                return true;
            }
        });
    }
    handleEvent('onClick', 'click');
    handleEvent('onChange', 'input');

    return {

        components: {},
        rootComponent: {},
        rootNode: {},

        createHelper: function(helper, fn) {
            Handlebars.registerHelper(helper, fn);
        },

        createComponent: function(component) {
            var self = this;

            //register component helper
            Handlebars.registerHelper(component.selector, function() {
                var args = arguments;
                var options = args[args.length - 1] || {};

                if (component.controller) {
                    if (!component.controllerInstance) {
                        component.controllerInstance = new component.controller();
                    }
                }
                else {
                    component.controllerInstance = {};
                }

                if (options.fn) {
                    component.controllerInstance.child = options.fn(this);
                }

                if (!component.controllerInstance.props) {
                    component.controllerInstance.props = {};
                }

                for (var attr in options.hash) {
                    component.controllerInstance.props[attr] = options.hash[attr];
                }

                if (!component.observe) {
                    //Watch changes once in the object controller
                    WatchJS.watch(component.controllerInstance, function() {
                        if (self.rootComponent[component.root]) {
                            // render again the root object pass the root selector
                            self.render(self.rootComponent[component.root].selector);
                        }
                    });

                    component.observe = true;
                }

                component.render = _parseTemplate.call(self, component.template(), component.controllerInstance);
                return new Handlebars.SafeString(component.render);
            });

            self.components[component.selector] = component;
            return self.components[component.selector];
        },

        render: function(selector, element, cb) {
            var self = this;
            var component = self.components[selector];

            //create virtual dom
            var template = Handlebars.helpers[selector]();
            var newTree = eval(dom2hscript.parseHTML(template.string.toString()));

            // checks if there is already a root component 
            if (self.rootComponent[selector]) {
                var oldTree = self.rootComponent[selector].tree;
                var patches = diff(oldTree, newTree);
                self.rootNode[selector] = patch(self.rootNode[selector], patches);
            }
            else {
                self.rootNode[selector] = createElement(newTree);
                element.appendChild(self.rootNode[selector]);

                for (var comp in self.components) {
                    if (self.components.hasOwnProperty(comp)) {
                        if (self.components[comp].render) {
                            if (!self.components[comp].root){
                                self.components[comp].root = selector;
                            }
                            if (self.components[comp].controllerInstance.componentDidMount && self.components[comp].root === selector) {
                                self.components[comp].controllerInstance.componentDidMount();
                            }
                        }
                    }
                }
            }

            self.rootComponent[selector] = clone(component);
            self.rootComponent[selector].tree = clone(newTree);

            // callback render components
            if (cb) cb();
        }
    };

})();

Fastify.$ = $;

module.exports = Fastify;
