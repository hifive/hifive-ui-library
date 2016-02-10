// ---- Fake Server ---- //
(function($) {
	/**
	 * トークン更新の有無を指定するリクエストヘッダーのキー
	 */
	var KEY_UPDATE_TOKEN = 'X-BERT-UPDATE-TOKEN';
	h5.u.obj.expose('bert.fw', {
		/**
		 * リクエストヘッダにトークンを更新しないフラグをセットして通信を行う
		 *
		 * @param {String} url URL
		 * @param {Object} option jQuery.ajaxに渡すオプションオブジェクト
		 * @returs {JqXHRWrapper} jqXHRWrapperオブジェクト
		 * @memberOf bert.fw
		 */
		ajax: function(url, option) {
			var opt = option || {};
			if (typeof url === 'object') {
				// 第一引数にオプションオブジェクトが指定されていた場合
				opt = url;
			} else {
				opt.url = url;
			}
			opt.beforeSend = function(xhr) {
				// トークンの更新をしないようにリクエストヘッダにフラグを格納する
				xhr.setRequestHeader(KEY_UPDATE_TOKEN, false);
			};
			return h5.ajax(opt);
		}
	});
})(jQuery);

// ---- Logic ---- //
(function($) {
	var DATA_URL = './complex-header-grid.json';

	var gridSample1Logic = {
		__name: 'bert.fw.grid.sample1.GridSample1Logic',

		// chromeではlocalファイルの読み込みに制限があるためコメントアウト
		// サーバへホストして動作確認する場合は、コメントを解除してデータはjsonファイルから読み込むようにしてください
//		loadData: function() {
//			return bert.fw.ajax(DATA_URL, {
//				dataType: 'json'
//			});
//		}

		loadData: function(){

			var def = this.deferred();

			setTimeout(function(){
				//データを直接変数に保持。（ローカル動作用）
				var data = [
						 {id :'1', col201304Sum :'320532', col201305Sum :'300360', col201306Sum :'299855', col201307Sum :'283526', col201308Sum :'211353', col201309Sum :'286300'}
						,{id :'2', col201304 :'75264', col201305 :'78721', col201306 :'54902', col201307 :'28303', col201308 :'8928', col201309 :'88563'}
						,{id :'3', col201304 :'75043', col201305 :'95380', col201306 :'70990', col201307 :'77090', col201308 :'11928', col201309 :'33939'}
						,{id :'4', col201304 :'72335', col201305 :'76154', col201306 :'79111', col201307 :'30835', col201308 :'12018', col201309 :'8719'}
						,{id :'5', col201304 :'40163', col201305 :'30442', col201306 :'92081', col201307 :'94818', col201308 :'85057', col201309 :'75668'}
						,{id :'6', col201304 :'57727', col201305 :'19663', col201306 :'2771', col201307 :'52480', col201308 :'93422', col201309 :'79411'}
						,{id :'7', col201304Sum :'34578', col201305Sum :'95373', col201306Sum :'78675', col201307Sum :'89683', col201308Sum :'68222', col201309Sum :'6248'}
						,{id :'8', col201304Sum :'21302', col201305Sum :'19671', col201306Sum :'66444', col201307Sum :'18391', col201308Sum :'83626', col201309Sum :'32267'}
						,{id :'9', col201304Sum :'89160', col201305Sum :'26553', col201306Sum :'65321', col201307Sum :'66997', col201308Sum :'51530', col201309Sum :'33360'}
						,{id :'10', col201304Sum :'465572', col201305Sum :'441957', col201306Sum :'510295', col201307Sum :'458597', col201308Sum :'414731', col201309Sum :'358175'}
						,{id :'11', col201304Sum :'239460', col201305Sum :'185345', col201306Sum :'181060', col201307Sum :'171314', col201308Sum :'196304', col201309Sum :'104167'}
						,{id :'12', col201304 :'91338', col201305 :'22346', col201306 :'1118', col201307 :'18212', col201308 :'45734', col201309 :'37661'}
						,{id :'13', col201304 :'62663', col201305 :'43593', col201306 :'48158', col201307 :'88367', col201308 :'46172', col201309 :'16741'}
						,{id :'14', col201304 :'63157', col201305 :'54554', col201306 :'91558', col201307 :'30674', col201308 :'48692', col201309 :'46514'}
						,{id :'15', col201304 :'22302', col201305 :'64852', col201306 :'40226', col201307 :'34061', col201308 :'55706', col201309 :'3251'}
						,{id :'16', col201304Sum :'76015', col201305Sum :'51863', col201306Sum :'47531', col201307Sum :'8486', col201308Sum :'42759', col201309Sum :'37445'}
						,{id :'17', col201304Sum :'12413', col201305Sum :'28385', col201306Sum :'91614', col201307Sum :'48272', col201308Sum :'18471', col201309Sum :'94131'}
						,{id :'18', col201304Sum :'42277', col201305Sum :'41194', col201306Sum :'81516', col201307Sum :'90520', col201308Sum :'69515', col201309Sum :'64233'}
						,{id :'19', col201304Sum :'370165', col201305Sum :'306787', col201306Sum :'401721', col201307Sum :'318592', col201308Sum :'327049', col201309Sum :'299976'}
						,{id :'20', col201304Sum :'182898', col201305Sum :'191455', col201306Sum :'64361', col201307Sum :'61063', col201308Sum :'115486', col201309Sum :'104492'}
						,{id :'21', col201304 :'89441', col201305 :'88795', col201306 :'1580', col201307 :'4495', col201308 :'21870', col201309 :'24097'}
						,{id :'22', col201304 :'87795', col201305 :'58417', col201306 :'60036', col201307 :'25672', col201308 :'33705', col201309 :'49300'}
						,{id :'23', col201304 :'5662', col201305 :'44243', col201306 :'2745', col201307 :'30896', col201308 :'59911', col201309 :'31095'}
						,{id :'24', col201304Sum :'81606', col201305Sum :'73169', col201306Sum :'95460', col201307Sum :'89462', col201308Sum :'92063', col201309Sum :'59199'}
						,{id :'25', col201304Sum :'2454', col201305Sum :'36642', col201306Sum :'32808', col201307Sum :'59050', col201308Sum :'8725', col201309Sum :'77551'}
						,{id :'26', col201304Sum :'28426', col201305Sum :'90759', col201306Sum :'39865', col201307Sum :'37360', col201308Sum :'57250', col201309Sum :'42750'}
						,{id :'27', col201304Sum :'295384', col201305Sum :'392025', col201306Sum :'232494', col201307Sum :'246935', col201308Sum :'273524', col201309Sum :'283992'}
						,{id :'28', col201304Sum :'1131121', col201305Sum :'748744', col201306Sum :'912016', col201307Sum :'777189', col201308Sum :'741780', col201309Sum :'658151'}
						,{id :'29', col201304Sum :'74651', col201305Sum :'19390', col201306Sum :'11616', col201307Sum :'88573', col201308Sum :'56774', col201309Sum :'76024'}
						,{id :'30', col201304Sum :'24915', col201305Sum :'3837', col201306Sum :'40231', col201307Sum :'12373', col201308Sum :'86876', col201309Sum :'18175'}
						,{id :'31', col201304Sum :'76776', col201305Sum :'17380', col201306Sum :'25598', col201307Sum :'58842', col201308Sum :'47719', col201309Sum :'11703'}
						,{id :'32', col201304Sum :'1307463', col201305Sum :'789351', col201306Sum :'989461', col201307Sum :'936977', col201308Sum :'933149', col201309Sum :'764053'}
				];

				def.resolve(data);
			}, 1000);

			return def.promise();
		}
	};

	h5.core.expose(gridSample1Logic);

})(jQuery);


// ---- Controller ---- //
(function($) {
	var complexHeaderGridController = {

		// --- コントローラの設定 --- //

		__name: 'complexHeaderGridController',

		__meta: {
			_gridController: {
				rootElement: '#grid'
			}
		},


		// --- プロパティ --- //

		_gridSample1Logic: bert.fw.grid.sample1.GridSample1Logic,

		_gridController: h5.ui.components.datagrid.ComplexHeaderGridController,


		// --- ライフサイクル関連のメソッド --- //

		__ready: function() {

			this._gridSample1Logic.loadData().done(this.own(function(data) {

				this._gridController.init({

					// データの ID を取得するためのプロパティ名
					idKey: 'id',

					// データの配列
					data: data,

					// 各列にどのプロパティをどんな順で表示するか
					columns: [{
						propertyName: 'col201304Sum'
					}, {
						propertyName: 'col201304'
					}, {
						propertyName: 'col201305Sum'
					}, {
						propertyName: 'col201305'
					}, {
						propertyName: 'col201306Sum'
					}, {
						propertyName: 'col201306'
					}, {
						propertyName: 'col201307Sum'
					}, {
						propertyName: 'col201307'
					}, {
						propertyName: 'col201308Sum'
					}, {
						propertyName: 'col201308'
					}, {
						propertyName: 'col201309Sum'
					}, {
						propertyName: 'col201309'
					}],

					// 各セルは <a> タグで表現する
					defaultFormatter: function(cellData) {
						if (cellData.value == null) {
							return '';
						}
						var text = h5.u.str.escapeHtml(cellData.value);
						//return '<a href="#">' + text + '</a>';
						text =  text.replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,' );
						return text + '&nbsp;'
					}
				});
			}));
		}
	};

	// ---- Init ---- //
	$(function() {
		h5.core.controller('body', complexHeaderGridController);
	});

})(jQuery);