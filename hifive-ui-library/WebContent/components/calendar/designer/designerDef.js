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
	var id = 'hifive.uiComponents.Calendar';
	var label = 'カレンダー';

	function createView() {
		//TODO カレンダーのDOMを生成する、コントローラ化等を記述
		var $elem = $('<div style="background-color:red; width:100px; height:100px"></div>');
		return $elem;
	}

	var editSchema = [{
		label: '幅',
		type: 'number',
		unit: '_NO_UNIT_',
		target: 'style(width)'
	}];

	var creator = {
		label: label,
		id: id,
		palette: 'hifive.uiComponents.Calendar',
		createView: createView,
		createEditor: editSchema,
		requirements: {
			jsMandatory: '$HIFIVE_UI_COMPONENTS$/calendar/src/CalendarController.js',
			cssMandatory: '$HIFIVE_UI_COMPONENTS$/calendar/src/CalendarController.css'
		}
	};

	hifive.editor.addCreator(creator);
})();