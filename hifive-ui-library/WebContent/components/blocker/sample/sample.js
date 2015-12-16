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
$(function() {
	var sampleController = {
		__name: 'sampleController',
		blocker: null,
		__ready: function() {
			this.$showBtn = this.$find('.show-blocker');
			this.$hideBtn = this.$find('.hide-blocker');
			//			this.$hideBtn.prop('disabled', true);
		},
		'.show-blocker click': function(ctx, $el) {
			var blocker = this.blocker;
			if (!blocker) {
				var target = $el.data('target') || this.$find('.blocker-target');
				var promises = $el.data('promises');
				if (promises) {
					this._dfd = this.deferred();
					promises = this._dfd.promise();
				}
				blocker = h5.ui.blocker({
					target: target,
					promises: promises
				});
				this.blocker = blocker;
			}
			blocker.show();
			var timeout = $el.data('timeout');
			if (timeout) {
				setTimeout(function() {
					blocker.hide();
				}, parseInt(timeout));
			}
			if (promises) {
				var dfd = this._dfd;
				setTimeout(function() {
					dfd.resolve();
				}, 1000);
			}
			//			this.$showBtn.prop('disabled', true);
			//			this.$hideBtn.prop('disabled', false);
		},

		'.hide-blocker click': function() {
			this.blocker && this.blocker.hide();
			//			this.$showBtn.prop('disabled', false);
			//			this.$hideBtn.prop('disabled', true);
		}
	};

	// バインド
	$('.sample').each(function() {
		h5.core.controller(this, sampleController);
	});
});