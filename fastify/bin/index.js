var h = require('../lib/virtual-dom/h');
var diff = require('../lib/virtual-dom/diff');
var patch = require('../lib/virtual-dom/patch');
var createElement = require('../lib/virtual-dom/create-element');
var dom2hscript = require("../lib/dom2hscript");
var WatchJS = require("../lib/watchjs");
var equal = require('equals')

var Handlebars = require('handlebars');
var clone = require('clone');
var $ = require('zepto-browserify').$

var Fastify = (function() {

    function _parseTemplate(template, controller) {
        var template = Handlebars.compile(template.toString());
        var html = template(controller);
        return html;
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
                fn.apply(self, params);
            }

            if (fn) {
                if (data.data) {
                    if (data.data.index > -1) {
                        key = '_' + data.data.index;
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
    handleEvent('onSubmit', 'submit');

    var fastify = {

        components: {},
        rootComponent: {},
        rootNode: {},
        
        SafeString: function(value){
            return new Handlebars.SafeString(value);
        },
        
        createHelper: function(helper, fb){
            Handlebars.registerHelper(helper, fb);
        },

        createClass: function(selector, component) {
            var self = this;

            component.selector = selector;
            //register component helper
            Handlebars.registerHelper(component.selector, function() {
                var args = arguments;
                var options = args[args.length - 1] || {};

                if (options.fn) {
                    component.controllerInstance.child = options.fn(this);
                }
                if (!component.props) {
                    component.props = {};
                    component.oldProps = {};
                }

                component.oldProps = clone(component.props);

                for (var attr in options.hash) {
                    if (typeof options.hash[attr] === 'function') {
                        component.props[attr] = options.hash[attr].bind(this);
                    }
                    else {
                        component.props[attr] = clone(options.hash[attr]);
                    }
                }

                if (!component.observe) {
                    if (component.getInitialState) {
                        component.state = component.getInitialState();
                    }
                    else {
                        component.state = {};
                    }
                    component.oldState = clone(component.state);
                    component.setState = function(state) {
                        var newState = clone(state);
                        component.state = clone(component.oldState);

                        $.extend(component.state, newState);
                        self.bootstrap(self.rootComponent[component.root].selector);
                        component.oldState = clone(component.state);
                    }
                    component.observe = true;
                }

                if (equal(component.oldState, component.state) && equal(component.oldProps, component.props) && component.template) {
                    return new Handlebars.SafeString(component.template);
                }

                component.template = _parseTemplate.call(self, component.render(), component);
                return new Handlebars.SafeString('<' + component.selector + '>' + component.template + '</' + component.selector + '>');
            });

            self.components[component.selector] = component;
            return self.components[component.selector];
        },

        bootstrap: function(selector, element, cb) {
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
                        if (self.components[comp].observe) {
                            if (!self.components[comp].root) {
                                self.components[comp].root = selector;
                            }
                            if (self.components[comp].componentDidMount && self.components[comp].root === selector) {
                                self.components[comp].componentDidMount();
                            }
                        }
                    }
                }
            }

            self.rootComponent[selector] = clone(component);
            self.rootComponent[selector].tree = clone(newTree);

            // callback render components
            if (cb) cb();
        },

        //Experimental
        Class: function() {
            var self = this;
            self.selector = null;

            self.render = function(template) {
                self.template = template;
            }

            self.initialize = function() {
                Fastify.createComponent(self.selector, {
                    render: self.render
                });
            }

        }

    };

    return fastify;

})();

Fastify.$ = $;

module.exports = Fastify;
