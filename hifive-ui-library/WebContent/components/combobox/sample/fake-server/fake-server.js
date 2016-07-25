// ---- Fake Server ---- //
(function($) {

	var originalData = [];
	var currentURL = "";

	//初期データ登録
	initOriginalData = function(url, option) {

		currentURL = url;

		var deferred = h5.async.deferred();

		jQuery.getJSON(url, function(json) {
			originalData = json.list;
			deferred.resolve();
		});
		return deferred.promise();

	};

	//postDataで絞り込む
	var filterByPostData = function(option) {

		var resultData = [];

		var btnCd = "";
		if (option.btnCd) {
			btnCd = option.btnCd;
		}

		var kozaNoKbn = "";
		if (option.kozaNoKbn) {
			kozaNoKbn = option.kozaNoKbn;
		}

		if (btnCd === "" && kozaNoKbn === "") {
			//postDataが設定されていない
			resultData = originalData;

		} else {

			var length = originalData.length;
			for ( var i = 0; i < length; i++) {

				var target = originalData[i];

				if (btnCd === target.btnCd && (btnCd !== "" && kozaNoKbn === "")) {
					//部店コードのみ一致
					resultData.push(target);

				} else if (kozaNoKbn === target.kozaNoKbn && (btnCd === "" && kozaNoKbn !== "")) {
					//口座番号区分のみ一致
					resultData.push(target);

				} else if (btnCd === target.btnCd && kozaNoKbn === target.kozaNoKbn) {

					//部店コードと口座番号区分が一致
					resultData.push(target);
				}
			}
		}

		return resultData;
	};

	//入力値でフィルターをかける
	var filterByInput = function(dataList, inputValue) {
		var resultData = [];

		//入力値が設定されていない場合は、何もしない
		if (!inputValue) {
			return dataList;
		}

		var length = dataList.length;
		for ( var i = 0; i < length; i++) {

			if (dataList[i].value.indexOf(inputValue) === 0) {
				resultData.push(dataList[i]);
			}
		}
		return resultData;
	};


	//フィルター処理
	var filter = function(option) {

		//postDataで絞り込みをかける
		var dataList = filterByPostData(option);

		//入力値で絞り込みをかける
		return filterByInput(dataList, option.value);

	};

	//結果作成
	var createResult = function(option) {
		var resultData = filter(option.data);
		var result = {
			list: resultData
		};
		result.totalCount = resultData.length;

		return result;
	};

	//ajaxの上書き
	h5.ajax = function(url, option) {

		var deferred = h5.async.deferred();

		setTimeout(function() {

			var result;
			if (originalData.length === 0 || currentURL !== url) {

				initOriginalData(url, option.data).done(function() {
					result = createResult(option);
					deferred.resolve(result);
				});
				return;
			}
			result = createResult(option);
			deferred.resolve(result);

		}, 200);

		return deferred.promise();
	};

})(jQuery);