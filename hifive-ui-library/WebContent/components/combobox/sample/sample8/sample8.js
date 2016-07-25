(function($) {
	var DATA_URL = './combobox.json';
	var DATA_URL2 = './combobox2.json';
	var comboboxSampleController = {

		__name: 'sample8.SampleController',

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

	//		'input[name="refresh"] click': function() {
	//			this._accountComboBoxController.refresh({
	//				url: DATA_URL2
	//			});
	//			alert("combobox data refresh!");
	//		}
	};

	h5.core.expose(comboboxSampleController);

})(jQuery);


// ---- Init ---- //
$(function() {
	h5.core.controller('body', sample8.SampleController);
});
;