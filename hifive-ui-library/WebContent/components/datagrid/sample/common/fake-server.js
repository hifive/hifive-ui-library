// ---- Fake Server ---- //
(function() {
	/**
	 * トークン更新の有無を指定するリクエストヘッダーのキー
	 */
	var KEY_UPDATE_TOKEN = 'X-BERT-UPDATE-TOKEN';
	h5.u.obj.expose('datagrid.sample', {
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

//---- Fake Server ---- //
(function($) {

	//ランダム数生成
	var random = function(range) {
		return Math.floor(Math.random() * range);
	};

	//氏名マスタ
	var nameMst = ['山田 太郎'
					, '加藤 次郎'
					, '山田 一郎'
					, '石井 三郎'
					, '三浦 四郎'
					, '山田 花子'
					, '長谷川 恵子'
					, '山田 栄子'
					, '山田 咲'
					, '野崎 太郎'
					, '森 次郎'
					, '加藤 四郎'
					, '野崎 三郎'
					, '松本 四郎'
					, '野崎 花子'
					, '石井 恵子'
					, '野崎 栄子'
					, '野崎 咲'
					, '森 太郎'
					, '鈴木 次郎'
					, '石井 一郎'
					, '鈴木 三郎'
					, '吉田 四郎'
					, '加藤 花子'
					, '鈴木 恵子'
					, '鈴木 栄子'
					, '長谷川 咲'
					, '山本 太郎'
					, '石井 次郎'
					, '加藤 一郎'
					, '山本 三郎'
					, '前田 四郎'
					, '山本 花子'
					, '山本 恵子'
					, '石井 栄子'
					, '山本 咲'
					, '佐藤 太郎'
					, '加藤 次郎'
					, '佐藤 一郎'
					, '長谷川 三郎'
					, '佐藤 四郎'
					, '加藤 栄子'
					, '森 恵子'
					, '佐藤 栄子'
					, '森 咲'
					, '長谷川 太郎'
					, '佐々木 次郎'
					, '石井 次郎'
					, '長谷川 三郎'
					, '佐々木 四郎'
					, '加藤 咲'
					, '佐々木 恵子'
					, '長谷川 栄子'
					, '三浦 咲'
					, '清水 太郎'
					, '三浦 次郎'
					, '松田 一郎'
					, '岡本 三郎'
					, '金子 四郎'
					, '高木 花子'
					, '近藤 恵子'
					, '藤本 栄子'
					, '村田 咲'
					];
	var nameMstLength = nameMst.length;

	//名前取得
	var getName = function(){
		return nameMst[random(nameMstLength)];
	};

	//配属マスタ
	var placeMst= ['東京', '大阪', '名古屋', '福岡'];
	var placeMstLength = placeMst.length;

	//配属取得
	var getPlace = function(){
		return placeMst[random(placeMstLength)];
	};

	//部署マスタ
	var positionMst=['第一事業部', '第二事業部', '営業部', '総務部', '人事部', '広報部', '経理部', '企画部', '技術部', '開発部', '研究部'];
	var positionMstLength = positionMst.length;

	//部署取得
	var getPosition = function(){
		return positionMst[random(positionMstLength)];
	};

	var TEL_AREA_CODE=['090', '080'];
	//電話番号取得
	var getTelNo = function(){

		var telNo = '';
		telNo+= TEL_AREA_CODE[random(2)];

		telNo+='-';
		for(var i = 0; i < 4; i++){
			telNo += '0123456789'.charAt(Math.random() * 10);
		}
		telNo+='-';
		for(var i = 0; i < 4; i++){
			telNo += '0123456789'.charAt(Math.random() * 10);
		}
		return telNo;
	};

	//メールアドレス取得
	var getMailAddress = function(){
		var address = '';
		for(var i = 0; i < 4; i++){
			address += 'abcdefghijklmnopqrstuvwxyz'.charAt(Math.random() * 25);
		}
		address+='.';
		for(var i = 0; i < 4; i++){
			address += 'abcdefghijklmnopqrstuvwxyz'.charAt(Math.random() * 25);
		}
		address += random(10);
		address += '@dummy.htmlhifive.com';
		return address;
	};

	var data = [];
	//サンプルデータ作成
	for (var i = 1; i <= 10000; i++) {
		var record = {
			id: 'J' + ("00000"+i).slice(-5).toString(),
			name: getName(),
			place : getPlace(),
			position : getPosition(),
			tel: getTelNo(),
			mail : getMailAddress(),
			note : ''
		};

		data.push(record);
	}

	var sortKey = null;
	var sortOrder = 'asc';

	var sorted = $.extend([], data);

	var sort = function(option) {
		var requestSortKey = option.sortKey;
		var requestSortOrder = option.sortOrder;
		if (typeof requestSortKey === 'undefined') {
			requestSortKey = null;
		}
		if (requestSortOrder == null) {
			requestSortOrder = 'asc';
		}

		if (sortKey === requestSortKey && sortOrder === requestSortOrder) {
			return;
		}

		sortKey = requestSortKey;
		sortOrder = requestSortOrder;

		if (sortKey == null) {
			sorted = $.extend([], data);
			return;
		}

		sorted.sort(function(x, y) {
			var xValue = x[sortKey];
			var yValue = y[sortKey];

			var base = (sortOrder === 'asc') ? 1 : -1;

			if (xValue < yValue) {
				return -1 * base;
			}
			if (xValue === yValue) {
				return 0;
			}
			return 1 * base;
		});
	};

	//結果作成処理
	var createResult = function(option) {

		sort(option);

		var result = {
			list: sorted.slice(option.start, option.end)
		};

		if (option.requireTotalCount) {
			result.totalCount = sorted.length;
		}

		return result;
	};


	var originAjax = datagrid.sample.ajax;

	//特定のURLでリクエストがきた場合のみサンプルデータを返す
	h5.ajax = function(url, option) {
		if (url !== '/api/sample3') {
			return originAjax(url, option);
		}

		var deferred = h5.async.deferred();

		setTimeout(function() {
			var result = createResult(option.data);
			deferred.resolve(result);
		}, 200);

		return deferred.promise();
	};

})(jQuery);