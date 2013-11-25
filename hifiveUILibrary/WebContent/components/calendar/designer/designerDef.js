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