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

	var logger = h5.log.createLogger('TabbableController');

	var tabbableController = {
		__name: 'TabbableController',

		__ready: function() {

		},

		'.nav-tabs a click': function(context) {
			context.event.preventDefault();
			var cur = $(context.event.currentTarget);
			var tabName = cur.attr('data-tab-name');
			var target = this.$find('[data-tab-name="' + tabName + '"]');
			this.$find('.nav-tabs > *').removeClass('active');
			cur.closest('.nav-tabs > *').addClass('active');
			this.$find('.tab-pane').removeClass('active');
			this.$find('.tab-pane').filter(target).addClass('active');
		}
	};
	$('.tabbable').each(function() {
		h5.core.controller(this, tabbableController);
	});


});