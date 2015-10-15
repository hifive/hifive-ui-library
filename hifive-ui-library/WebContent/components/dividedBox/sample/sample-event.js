/*
 * Copyright (C) 2012-2014 NS Solutions Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
(function() {
	var controller = {
		__name: 'sample.controller.EventLogController',

		'{rootElement} boxSizeChange': function(ctx) {
			var eventName = ctx.event.type;
			var target = ctx.event.target;
			var evArg = ctx.evArg;
			this._log(eventName, target, evArg);
		},
		'{rootElement} dividerTrackstart': function(ctx) {
			var eventName = ctx.event.type;
			var target = ctx.event.target;
			var evArg = ctx.evArg;
			this._log(eventName, target, evArg);
		},
		'{rootElement} dividerTrackmove': function(ctx) {
			var eventName = ctx.event.type;
			var target = ctx.event.target;
			var evArg = ctx.evArg;
			this._log(eventName, target, evArg);
		},
		'{rootElement} dividerTrackend': function(ctx) {
			var eventName = ctx.event.type;
			var target = ctx.event.target;
			var evArg = ctx.evArg;
			this._log(eventName, target, evArg);
		},
		'.log-clear click': function() {
			var $logTarget = this.$find('.event-log');
			$logTarget.empty();
		},
		_log: function(eventName, target, evArg) {
			var $logTarget = this.$find('.event-log');
			var targetStr = this._getElementStr(target);
			var evArgStr = 'undefined';
			if (evArg) {
				evArgStr = '{';
				for ( var p in evArg) {
					evArgStr += p + ': ';
					var val = evArg[p];
					if (val && val.nodeType === 1) {
						val = this._getElementStr(val);
					}
					evArgStr += val + ',';
				}
				evArgStr = evArgStr.substring(0, evArgStr.length - 1) + '}';
			}
			this.view.append($logTarget, 'event-log', {
				eventName: eventName,
				target: targetStr,
				evArg: evArgStr
			});
			$logTarget.scrollTop($logTarget[0].scrollHeight);
		},
		_getElementStr: function(elm) {
			var $elm = $(elm);
			return '<' + $elm[0].tagName + '.' + $elm.attr('class').replace(/ /g, '.') + '>';
		}
	};
	h5.core.expose(controller);
})();

(function() {
	var controller = {
		__name: 'sample.controller.Sample1Controller',

		verticalDBController: h5.ui.components.DividedBox.DividedBox,
		horizontalDBController: h5.ui.components.DividedBox.DividedBox,
		eventLogController: sample.controller.EventLogController,
		__meta: {
			verticalDBController: {
				rootElement: '.dividedBox.vertical'
			},
			horizontalDBController: {
				rootElement: '.dividedBox.horizontal'
			}
		},
		__init: function() {
			this.$find('.box:not(.dividedBox)').prepend(
					'<button class="btn btn-sm resizeBox" data-size="200">200pxにリサイズ</button>');
		},
		'.resizeBox click': function(ctx, $el) {
			var $box = $el.parents('.box').eq(0);
			var $db = $el.parents('.dividedBox').eq(0);
			var dbCtrl = $db.hasClass('vertical') ? this.verticalDBController
					: this.horizontalDBController;
			dbCtrl.resize($box, $el.data('size'));
		}
	};
	h5.core.expose(controller);
})();

(function() {
	var controller = {
		__name: 'sample.controller.Sample2Controller',

		sample1Controller: sample.controller.Sample1Controller,
		/**
		 * トラック中かどうかのフラグ
		 */
		_isTracking: false,

		__ready: function() {
			var $boxes = this.$find('.box:not(.dividedBox)');
			$boxes.each(this.ownWithOrg(function(box) {
				$(box).append('<p class="size"></p>');
				this._showSize(box);
			}));
		},

		'{rootElement} boxSizeChange': function(ctx) {
			// トラック操作中なら何もしない
			if (this._isTracking) {
				return;
			}
			this._showSize(ctx.event.target);
		},

		'{rootElement} dividerTrackstart': function(ctx) {
			// トラック中のフラグを建てる
			this._isTracking = true;
			// 両サイドのボックスを半透明にする
			$(ctx.evArg.prev).addClass('translucent');
			$(ctx.evArg.next).addClass('translucent');
		},

		'{rootElement} dividerTrackend': function(ctx) {
			this._isTracking = false;
			// 半透明解除
			this.$find('.translucent').removeClass('translucent');
			this._showSize(ctx.evArg.prev);
			this._showSize(ctx.evArg.next);
		},

		_showSize: function(box) {
			var $box = $(box);
			if ($box.hasClass('dividedBox')) {
				// 入れ子にしているボックスは何もしない
				return;
			}
			var size = $box.width() + '×' + $box.height();
			$box.find('.size').text(size);
		}
	};
	h5.core.expose(controller);
})();

$(function() {
	$('.sample').each(function() {
		var ctrlName = $(this).data('controller-name');
		var ctrl = sample.controller[ctrlName];
		h5.core.controller(this, ctrl);
	});
});