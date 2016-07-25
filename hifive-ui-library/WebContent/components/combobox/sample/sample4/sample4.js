(function($) {
	var DATA_URL = './combobox.json';

	var comboboxLogic = {
		__name: 'sample4.ComboboxLogic',

		loadData: function() {
			return h5.ajax(DATA_URL, {
				dataType: 'json'
			});
		}
	};
	h5.core.expose(comboboxLogic);
})(jQuery);

(function($) {

	var comboboxSampleController = {

		__name: 'sample4.SampleController',

		/** コンボボックスコントローラ */
		_accountComboBoxController: h5.ui.components.combobox.ComboBoxController,

		__meta: {
			_accountComboBoxController: {
				rootElement: 'input[name="accountcode"]'
			}
		},

		_comboboxLogic: sample4.ComboboxLogic,

		__ready: function() {
			this._comboboxLogic.loadData().done(this.own(function(data) {
				this._accountComboBoxController.init({
					data: data.list,
					filter: function(inputStr, comboboxData) {
						//先頭と末尾の空白は無視するフィルターをかける
						var trimStr = jQuery.trim(inputStr);
						return comboboxData.value.indexOf(trimStr) === 0;

					}
				});

			})).fail(
					function(XMLHttpRequest, textStatus, errorThrown) {
						alert("XMLHttpRequest : " + XMLHttpRequest.status + " textStatus : "
								+ textStatus + " errorThrown : " + errorThrown.message);
					});
		}
	};

	h5.core.expose(comboboxSampleController);

})(jQuery);


// ---- Init ---- //
$(function() {
	h5.core.controller('body', sample4.SampleController);
});
;