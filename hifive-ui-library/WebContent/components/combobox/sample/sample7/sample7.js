(function($) {
	var DATA_URL = './combobox.json';
	var comboboxSampleController = {

		__name: 'sample7.SampleController',

		/** コンボボックスコントローラ */
		_accountComboBoxController: h5.ui.components.combobox.ComboBoxController,

		__meta: {
			_accountComboBoxController: {
				rootElement: 'input[name="accountcode"]'
			}
		},

		__ready: function() {
			this._accountComboBoxController.init({
				url: DATA_URL
			});
		},

		'input[name="getValue"] click': function() {
			alert(this._accountComboBoxController.getValue());
		},

		'input[name="getSelectedItem"] click': function() {
			var item = this._accountComboBoxController.getSelectedItem();
			var str = "";
			for ( var prop in item) {
				str += prop + ":" + item[prop] + ", ";
			}
			alert(str);
		},
	};

	h5.core.expose(comboboxSampleController);

})(jQuery);


// ---- Init ---- //
$(function() {
	h5.core.controller('body', sample7.SampleController);
});
;