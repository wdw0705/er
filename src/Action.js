/**
 * ER (Enterprise RIA)
 * Copyright 2013 Baidu Inc. All rights reserved.
 * 
 * @file Action类声明
 * @author otakustay
 */
define(
    'Action',
    function(require) {
        var util = require('./util');
        var Observable = require('./Observable');

        /**
         * Action类声明
         * 
         * 在ER框架中，Action并不一定要继承该类，
         * 任何有一个名为`enter`的方法的对象均可作为Action
         * 
         * 该类制定了一个完整的Action的执行周期
         *
         * @constructor
         * @extends Observable
         */
        function Action() {
            Observable.apply(this, arguments);
        }

        /**
         * 当前Action运行上下文
         *
         * @type {Object}
         * @protected
         */
        Action.prototype.context = null;

        /**
         * 指定对应的Model类型
         *
         * @type {?function}
         * @protected
         */
        Action.prototype.modelType = null;

        /**
         * 指定对应的View类型
         *
         * @type {?function}
         * @protected
         */
        Action.prototype.viewType = null;

        /**
         * 进入Action执行周期
         *
         * @param {Object} context 进入Action的上下文
         * @param {URL} context.url 当前的URL
         * @param {?URL} context.referrer 来源的URL
         * @param {string} container 用来展现当前Action的DOM容器的id
         * @public
         */
        Action.prototype.enter = function(context) {
            /**
             * 进入Action生命周期
             *
             * @event enter
             */
            this.fire('enter');

            this.context = context;

            var urlQuery = context && context.url && context.url.getQuery();
            var args = util.mix({}, context, urlQuery);

            this.model = this.createModel(args);
            if (this.model && typeof this.model.load === 'function') {
                var loadingModel = this.model.load();
                return loadingModel.done(util.bindFn(this.forwardToView, this));
            }
            else {
                this.forwardToView();
                return require('./Deferred').resolved();
            }
        };

        /**
         * 创建对应的Model对象
         *
         * @param {Object} context 进入Action的上下文
         * @param {URL} context.url 当前的URL
         * @param {?URL} context.referrer 来源的URL
         * @param {string} container 用来展现当前Action的DOM容器的id
         * @return {Object} 当前Action需要使用的Model对象
         * @protected
         */
        Action.prototype.createModel = function(context) {
            return this.modelType ? new this.modelType(context) : {};
        };

        /**
         * 加载完Model后，进入View相关的逻辑
         *
         * @private
         */
        Action.prototype.forwardToView = function() {
            /**
             * Model加载完成时触发
             *
             * @event modelloaded
             */
            this.fire('modelloaded');

            this.view = this.createView();
            if (this.view) {
                this.view.model = this.model;
                if (this.context) {
                    this.view.container = this.context.container;
                }

                /**
                 * 视图开始渲染时触发
                 *
                 * @event beforerender
                 */
                this.fire('beforerender');

                this.view.render();

                /**
                 * 视图渲染完毕后触发
                 *
                 * @event rendered
                 */
                this.fire('rendered');

                this.initBehavior();

                /**
                 * Action进入完毕后触发
                 *
                 * @event entercomplete
                 */
                this.fire('entercomplete');
            }
            else {
                throw new Error('No view attached to this action');
            }
        };

        /**
         * 创建对应的View对象
         *
         * @return {Object} 当前Action需要使用的View对象
         * @public
         */
        Action.prototype.createView = function() {
            return this.viewType ? new this.viewType() : null;
        };

        /**
         * 处理与View相关的交互逻辑
         *
         * @protected
         */
        Action.prototype.initBehavior = function() {
        };

        /**
         * 离开当前Action，清理Model和View
         *
         * @protected
         */
        Action.prototype.leave = function() {
            /**
             * 准备离开Action时触发
             *
             * @event beforeleave
             */
            this.fire('beforeleave');

            if (this.model) {
                if (typeof this.model.dispose === 'function') {
                    this.model.dispose();
                }
                this.model = null;
            }

            if (this.view) {
                if (typeof this.view.dispose === 'function') {
                    this.view.dispose();
                }
                this.view = null;
            }

            /**
             * 离开Action后触发
             *
             * @event leave
             */
            this.fire('leave');
        };

        util.inherits(Action, Observable);
        return Action;
    }
);