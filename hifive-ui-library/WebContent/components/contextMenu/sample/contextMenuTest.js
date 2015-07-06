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

	var logger = h5.log.createLogger('ContextMenuTestController');

	var contextMenuTestController = {

		__name: 'ContextMenuTestController',

		contextMenuController: h5.ui.ContextMenuController,

		__meta: {
			contextMenuController: {
				rootElement: '> ._contextMenuBox'
			},
		},

		__ready: function(context) {
			this.contextMenuController.contextMenuExp = this.$find('.contextMenuExp').val();
			this.$find('.targetAll').val(['1']);
			this.contextMenuController.targetAll = true;

		},

		'.targetAll change': function(context) {
			this.contextMenuController.targetAll = context.event.target.checked;
		},

		'.contextMenuExp change': function(context) {
			this.contextMenuController.contextMenuExp = $(context.event.target).val();
		},
	};

	h5.core.controller('#contextMenuTest', contextMenuTestController);
});