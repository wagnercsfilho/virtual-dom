var h = require('../lib/virtual-dom/h');
var diff = require('../lib/virtual-dom/diff');
var patch = require('../lib/virtual-dom/patch');
var createElement = require('../lib/virtual-dom/create-element');
var dom2hscript = require("../lib/dom2hscript");

var Handlebars = require('handlebars');
var clone = require('clone');
var WatchJS = require("watchjs");
var shortid = require('shortid');
//$ = require('zepto-browserify').$
var $ = require('jquery-browserify');

var Fastify = (function() {

    function _parseTemplate(template, controller) {
        var template = Handlebars.compile(template);
        var result = template(controller);
        return result;
    }

    Handlebars.registerHelper('click', function() {
        //console.log(arguments, this);
        var args = arguments;
        var fn = args[0];
        var id = shortid.generate();
        $(document).on('click', "#"+id, function(e) {
            fn()
        });
        return new Handlebars.SafeString('id="' + id + '"');
    });
    
    Handlebars.registerHelper('model', function() {
        console.log(arguments, this);
        var args = arguments;
        var model = args[0];
        var id = shortid.generate();
        $(document).on('keypress', "#"+id, function(e) {
            for (var attr in model.hash){
                this.parent[model] = e.targetElement.value;
            }
        });
        return new Handlebars.SafeString('id="' + id + '"');
    });

    return {

        components: {},

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
                            for (var c in self.components) {
                                if (c !== 'rootComponent')
                                    self.createComponent(self.components[c]);
                            }
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

            return self.components[selector];
        },

        render: function(selector, element) {
            var self = this;
            var component = self.components[selector];

            console.log(self.components[selector].render)

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
            }

            self.components['rootComponent'] = clone(component);
            self.components['rootComponent'].tree = newTree;
        }
    };

})();

module.exports = Fastify;
