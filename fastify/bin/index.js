var h = require('../lib/virtual-dom/h');
var diff = require('../lib/virtual-dom/diff');
var patch = require('../lib/virtual-dom/patch');
var createElement = require('../lib/virtual-dom/create-element');
var dom2hscript = require("../lib/dom2hscript");

var Handlebars = require('handlebars');
var clone = require('clone');
var WatchJS = require("watchjs");
var shortid = require('shortid');
var $ = require('zepto-browserify').$
    //var $ = require('jquery-browserify');

var Fastify = (function() {

    function _parseTemplate(template, controller) {
        var template = Handlebars.compile(template);
        var result = template(controller);
        return result;
    }

    function handleEvent(helper, ev) {
        Handlebars.registerHelper(helper, function() {
            var self = this;
            var args = arguments;
            var data = args[0];
            var index = '';
            var hashKeys = Object.keys(data.hash);
            var id = hashKeys[hashKeys.length - 1];
            var fn = data.hash[id];

            function handle(e) {
                var arr = hashKeys.map(function(key) {
                    return data.hash[key]
                });
                var params = [e].concat(arr.shift());
                fn(e);
            }

            if (fn) {
                if (self.props) {
                    if (self.props.index !== undefined && self.props.index !== null) {
                        index = '_' + self.props.index;
                    }
                }
                $(document).off(ev, "#" + id + index);
                $(document).on(ev, "#" + id + index, handle);
                return new Handlebars.SafeString('id="' + id + index + '"');
            }
            else {
                return true;
            }
        });
    }
    handleEvent('onclick', 'click');
    handleEvent('onchange', 'input');

    return {

        components: {},

        createHelper: function(helper, fn) {
            Handlebars.registerHelper(helper, fn);
        },

        createComponent: function(component) {
            var self = this;

            var selector = component.selector;
            self.components[selector] = component;

            //init component controller
            if (self.components[selector].controller) {
                if (!self.components[selector].controllerInstance) {
                    self.components[selector].controllerInstance = new self.components[selector].controller();
                }

                //Watch changes once in the object controller
                if (!self.components[selector].observer) {
                    WatchJS.watch(self.components[selector].controllerInstance, function() {
                        if (self.components['rootComponent']) {
                            // update all objects

                            self.createComponent(self.components[selector]);

                            // render again the root object pass the root selector
                            self.render(self.components['rootComponent'].selector);
                        }
                    });
                    // change for true the observer attribute
                    self.components[selector].observer = true;
                }
            }
            else {
                // create empty controller
                self.components[selector].controllerInstance = {};
            }

            // parse template
            self.components[selector].render = _parseTemplate.call(self, self.components[selector].template(), self.components[selector].controllerInstance);

            //register component helper
            if (!self.components[selector].observer) {
                Handlebars.registerHelper(selector, function() {
                    var args = arguments;
                    var options = args[args.length - 1];
                    var controller = self.components[options.name].controllerInstance;
                    if (options.fn) {
                        controller.child = options.fn(this);
                    }
                    if (!controller.props) {
                        controller.props = {};
                    }
                    for (var attr in options.hash) {
                        //if (typeof options.hash[attr] === 'function') {
                        //    var fn = options.hash[attr];
                        //    controller.props[attr] =  options.hash[attr].toString();
                        //}
                        //else {
                        controller.props[attr] = options.hash[attr];
                        //}
                    }

                    self.components[selector].render = _parseTemplate.call(self, self.components[selector].template(), self.components[selector].controllerInstance);
                    return new Handlebars.SafeString(self.components[selector].render);
                });
            }
            return self.components[selector];
        },

        render: function(selector, element, cb) {
            var self = this;
            var component = self.components[selector];

            //create virtual dom
            var newTree = eval(dom2hscript.parseHTML(self.components[selector].render));

            // checks if there is already a root component 
            if (self.components['rootComponent']) {
                var oldTree = self.components['rootComponent'].tree;
                var patches = diff(oldTree, newTree);
                self.rootNode = patch(self.rootNode, patches);
            }
            else {
                self.rootNode = createElement(newTree);
                element.appendChild(self.rootNode);
                cb();
            }

            self.components['rootComponent'] = clone(component);
            self.components['rootComponent'].tree = newTree;
        }
    };

})();

module.exports = Fastify;
