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
 * hifive
 *   version Nightly_2015-06-12_13-35-04-211
 *   gitCommitId : ed64d650c3771d580b8c26368c0fb96a25dab9f2
 *   build at 2015/06/12 13:35:05.679 (+0900)
 *   (scopedglobals,util,async,resource,controller,dataModel,view,modelWithBinding,ui,api.geo,api.sqldb,api.storage,scene)
 */
(function($){

	// =========================================================================
	//
	// Prelude
	//
	// =========================================================================

	var savedH5 = undefined;

	//h5存在チェック
	if (window.h5) {
		if (window.h5.env && (window.h5.env.version === 'Nightly_2015-06-12_13-35-04-211')) {
			// 既にロード済みのhifiveと同じバージョンをロードしようとした場合は何もしない
			return;
		}
		//coexistのために既存のh5を退避
		savedH5 = window.h5;
	}

	// h5空間を新規に作成。クロージャでくるんでいるので
	// 以降の各モジュールが見るh5はここで定義された(新しい)h5になる
	var h5 = {};

	// =============================
	// Expose to window
	// =============================

	window.h5 = h5;

	h5.coexist = function() {
		window.h5 = savedH5;
		return h5;
	};

	h5.env = {
		version: 'Nightly_2015-06-12_13-35-04-211'
	};

	// =========================================================================
	//
	// Extenal Library
	//
	// =========================================================================


	// =========================================================================
	//
	// Modules
	//
	// =========================================================================


/* h5scopedglobals */

// =========================================================================
//
// Scoped Globals
//
// =========================================================================
// =============================
// Misc Variables
// =============================
/**
 * { (エラーコード): (フォーマット文字列) } マップ
 *
 * @private
 */
var errorCodeToMessageMap = {};

/**
 * { (エラーコード)： (フォーマッタ関数) } マップ
 *
 * @private
 */
var errorCodeToCustomFormatterMap = {};

/**
 * ネットワークに繋がらない時にjqXhr.statusに格納されるコード(IE)。通信をリトライするかどうかの判定に使用。
 *
 * @private
 */
var ERROR_INTERNET_CANNOT_CONNECT = 12029;

/**
 * undefinedかどうかの判定で、typeofで判定する
 *
 * @private
 */
var TYPE_OF_UNDEFINED = 'undefined';

/**
 * Node.ELEMENT_NODE。IE8-ではNodeがないので自前で定数を作っている
 *
 * @private
 */
var NODE_TYPE_ELEMENT = 1;

/**
 * Node.DOCUMENT_NODE。IE8-ではNodeがないので自前で定数を作っている
 *
 * @private
 */
var NODE_TYPE_DOCUMENT = 9;

//=============================
// Errors
//=============================
// =============================
// Misc Functions
// =============================

/**
 * フレームワークエラーを発生させます。
 *
 * @private
 * @param code {Number} エラーコード
 * @param msgParam {Any[]} フォーマットパラメータ
 * @param detail {Any} 追加のデータ(内容はAPIごとに異なる)
 */
function throwFwError(code, msgParam, detail) {
	var msg = null;
	var msgSrc = errorCodeToMessageMap[code];

	var customFormatter = errorCodeToCustomFormatterMap[code];
	if (customFormatter) {
		msg = customFormatter(code, msgSrc, msgParam, detail);
	}

	//カスタムフォーマッタがnull/undefinedを返した場合も標準フォーマッタにかける
	if (!msg && msgSrc) {
		msg = h5.u.str.format.apply(null, [msgSrc].concat(msgParam));
	}

	if (msg) {
		//最後に必ずエラーコードを付ける
		msg += '(code=' + code + ')';
	}

	var e = msg ? new Error(msg) : new Error('FwError: code = ' + code);

	if (code) {
		e.code = code;
	}
	if (detail) {
		e.detail = detail;
	}

	throw e;
}

/* del begin */
// テストのためにexposeする
window.com = {
	htmlhifive: {
		throwFwError: throwFwError
	}
};
/* del end */


/**
 * エラーコードとエラーメッセージのマップを追加します。
 *
 * @private
 * @param mapObj {Object} { (エラーコード): (フォーマット文字列) }という構造のオブジェクト
 */
function addFwErrorCodeMap(mapObj) {
	for ( var code in mapObj) {
		if (mapObj.hasOwnProperty(code)) {
			errorCodeToMessageMap[code] = mapObj[code];
		}
	}
}

/**
 * エラーコードとカスタムメッセージフォーマッタのマップを追加します。
 *
 * @private
 * @param errorCode エラーコード
 * @param formatter カスタムメッセージフォーマッタ
 */
function addFwErrorCustomFormatter(errorCode, formatter) {
	errorCodeToCustomFormatterMap[errorCode] = formatter;
}

/**
 * 非同期APIのReject時の理由オブジェクトを作成します。
 *
 * @private
 * @param code {Number} エラーコード
 * @param msgParam {Any[]} フォーマットパラメータ
 * @param detail {Any} 追加のデータ(内容はAPIごとに異なる)
 * @returns {Object} 理由オブジェクト
 */
function createRejectReason(code, msgParam, detail) {
	var msg = null;
	var f = errorCodeToMessageMap[code];
	if (f) {
		var args = [f].concat(msgParam);
		msg = h5.u.str.format.apply(null, args);
	}

	return {
		code: code,
		message: msg,
		detail: detail
	};
}

/**
 * 引数を配列化します。既に配列だった場合はそれをそのまま返し、 配列以外だった場合は配列にして返します。 ただし、nullまたはundefinedの場合はそのまま返します。
 *
 * @private
 * @param value 値
 * @returns 配列化された値、ただし引数がnullまたはundefinedの場合はそのまま
 */
function wrapInArray(value) {
	if (value == null) {
		return value;
	}
	return isArray(value) ? value : [value];
}

/**
 * 相対URLを絶対URLに変換します。
 *
 * @private
 * @param {String} relativePath 相対URL
 * @returns {String} 絶対パス
 */
var toAbsoluteUrl = (function() {
	var a = null;
	var span = null;
	var isHrefPropAbsoluteFlag = null;
	function isHrefPropAbsolute() {
		if (isHrefPropAbsoluteFlag === null) {
			a.setAttribute('href', './');
			isHrefPropAbsoluteFlag = a.href !== './';
		}
		return isHrefPropAbsoluteFlag;
	}
	return function(relativePath) {
		if (!a) {
			// a.hrefを使わない場合でも、a.hrefが使えるかどうかの判定でa要素を使用するので、最初の呼び出し時に必ずa要素を作る
			a = document.createElement('a');
		}
		if (isHrefPropAbsolute()) {
			a.setAttribute('href', relativePath);
			return a.href;
		}
		// a.hrefが絶対パスにならない場合はinnerHTMLを使う
		if (!span) {
			span = document.createElement('span');
		}
		span.innerHTML = '<a href="' + relativePath + '" />';
		return span.firstChild.href;
	};
})();

/**
 * 引数が文字列かどうかを判定します。
 *
 * @private
 * @param {Any} target 値
 * @returns {boolean} 文字列ならtrue、そうでないならfalse
 */
function isString(target) {
	return typeof target === 'string';
}

/**
 * DeferredオブジェクトがReject状態かどうかを判定します。 jQuery1.7でDeferred.isRejected/isResolvedはDeprecatedとなり、
 * 1.8で削除された（代わりにstate()メソッドが1.7から追加された）ので、 使用可能なAPIを用いて判定します。
 *
 * @private
 * @param {Object} dfd Deferredオブジェクト
 * @returns {Boolean} Rejected状態かどうか
 */
function isRejected(dfd) {
	if (dfd.isRejected) {
		return dfd.isRejected();
	}
	//jQuery 1.7でisRejectedはDeprecatedになり、1.8.0で削除された
	return dfd.state() === 'rejected';
}

/**
 * DeferredオブジェクトがReject状態かどうかを判定します。 jQuery1.7でDeferred.isRejected/isResolvedはDeprecatedとなり、
 * 1.8で削除された（代わりにstate()メソッドが1.7から追加された）ので、 使用可能なAPIを用いて判定します。
 *
 * @private
 * @param {Object} dfd Deferredオブジェクト
 * @returns {Boolean} Resolved状態かどうか
 */
function isResolved(dfd) {
	if (dfd.isResolved) {
		return dfd.isResolved();
	}
	return dfd.state() === 'resolved';
}

/**
 * 引数が名前空間として有効な文字列かどうかを判定します。 ただし、全角文字が含まれる場合はfalseを返します。
 *
 * @private
 * @param {Any} property 値
 * @returns {boolean} 名前空間として有効な文字列であればtrue、そうでないならfalse
 */
function isValidNamespaceIdentifier(property) {
	if (!isString(property)) {
		return false;
	}

	// 全角文字は考慮しない
	return !!property.match(/^[A-Za-z_\$][\w|\$]*$/);
}

/**
 * 文字列をHTMLにパースします
 * <p>
 * jQuery.parseHTMLがある(jQuery1.8以降)場合はjQuery.parseHTMLと同じです
 * </p>
 * <p>
 * ない場合はjQuery1.8以降のparseHTMLと同様の動作を実装しています。
 * </p>
 *
 * @private
 * @param {String} data HTML文字列
 * @param {Document} [context=document] createElementを行うDocumentオブジェクト。省略した場合はdocumentを使用します
 * @param {Boolean} [keppScripts=false] script要素を生成するかどうか。デフォルトは生成しない(false)です
 */
parseHTML = $.parseHTML ? $.parseHTML : function(data, context, keepScripts) {
	if (!data || !isString(data)) {
		return null;
	}
	if (typeof context === 'boolean') {
		// context指定が省略された場合(第2引数がboolean)なら第2引数をkeepScripts指定として扱う
		keepScripts = context;
		context = false;
	}
	context = context || document;

	// タグで囲って、$()でパースできるようにする
	data = '<div>' + data + '</div>';
	var $ret = $(data, context);
	if (!keepScripts) {
		// script要素の除去
		$ret.find('script').remove();
	}
	// タグで囲ってパースしたので、parentElementがダミーのものになっている
	// そのためフラグメントを生成してparentElementがnullになるようにする
	var ret = $ret[0].childNodes;
	var fragment = context.createDocumentFragment();
	for (var i = 0, l = ret.length; i < l; i++) {
		fragment.appendChild(ret[i]);
	}
	return fragment.childNodes;
};

// =============================
// ロガー・アスペクトで使用する共通処理
// =============================
/**
 * 文字列の正規表現記号をエスケープします。
 *
 * @private
 * @param {String} str 文字列
 * @returns {String} エスケープ済文字列
 */
function escapeRegex(str) {
	return str.replace(/\W/g, '\\$&');
}

/**
 * 引数がStringの場合、RegExpオブジェクトにして返します。 引数がRegExpオブジェクトの場合はそのまま返します。
 *
 * @private
 * @param {String|RegExp} target 値
 * @returns {RegExp} オブジェクト
 */
function getRegex(target) {
	if ($.type(target) === 'regexp') {
		return target;
	}
	var str = '';
	if (target.indexOf('*') !== -1) {
		var array = $.map(target.split('*'), function(n) {
			return escapeRegex(n);
		});
		str = array.join('.*');
	} else {
		str = target;
	}
	return new RegExp('^' + str + '$');
}

/**
 * promiseのメソッド呼び出しを_h5UnwrappedCallを使って行います。 jQueryのpromiseが渡されたらそのまま実行します。
 *
 * @private
 * @param {Deferred|Promise} promise
 * @param {String} method
 * @param {Array|Any} args 複数の引数があるときは配列で渡します。
 */
function registerCallbacksSilently(promise, method, args) {
	if (promise) {
		promise._h5UnwrappedCall ? promise._h5UnwrappedCall(method, args) : promise[method](args);
	}
}

/**
 * 使用しているjQueryのバージョンで推奨されている、Deferredをフィルタリングまたはチェーンするメソッドを実行します。
 * <p>
 * deferred.pipe()がjQuery1.8から非推奨となったため1.8以上の場合then()を、1.7以下の場合はpipe()を実行します。
 *
 * @private
 * @param {Promise} promise Promiseオブジェクト
 * @param {Function} doneFilter doneコールバック
 * @param {Function} failFilter failコールバック
 * @param {Function} progressFilter progressコールバック
 * @returns {Promise} Promiseオブジェクト
 */
function thenCompat(promise, doneFilter, failFilter, progressFilter) {
	//curCSS()はjQuery1.8.0で削除されたメソッド。これの有無で1.8以上かどうかの判定を代理している
	return promise[$.hasOwnProperty('curCSS') ? 'pipe' : 'then'](doneFilter, failFilter,
			progressFilter);
}

/**
 * 渡されたオブジェクトがwindowオブジェクトかどうか判定する
 *
 * @private
 * @param {Any} obj
 * @returns {Boolean} objがwindowオブジェクトかどうか
 */
function isWindowObject(obj) {
	// nodeがdocumentを持ち、documentから得られるwindowオブジェクトがnode自身ならnodeをwindowオブジェクトと判定する
	return obj && obj.document && obj.document.nodeType === NODE_TYPE_DOCUMENT
			&& getWindowOfDocument(obj.document) === obj;
}

/**
 * ノードからドキュメントを取得。
 * <p>
 * 引数がdocumentノードなら引数をそのまま、ノードならownerDocument、windowオブジェクトならそのdocumentを返します。nodeがいずれにも該当しない場合はnullを返します。
 * </p>
 *
 * @private
 * @param {DOM} node
 * @returns {Document} documentオブジェクト
 */
function getDocumentOf(node) {
	if (typeof node.nodeType === TYPE_OF_UNDEFINED) {
		// ノードではない
		if (isWindowObject(node)) {
			// windowオブジェクトならwindow.documentを返す
			return node.document;
		}
		return null;
	}
	if (node.nodeType === NODE_TYPE_DOCUMENT) {
		// nodeがdocumentの場合
		return node;
	}
	// nodeがdocument以外(documentツリー属するノード)の場合はそのownerDocumentを返す
	return node.ownerDocument;
}

/**
 * documentオブジェクトからwindowオブジェクトを取得
 *
 * @private
 * @param {Document} doc
 * @returns {Window} windowオブジェクト
 */
function getWindowOfDocument(doc) {
	// IE8-だと、windowとwindow.document.parentWindowで、同じwindowを指すが、"==="で比較するとfalseになる (#339)
	// イベントハンドラをバインドするターゲットがwindowである時は、window.document.parentWindowではなく
	// windowにバインドして、イベントハンドラのthis(コントローライベントハンドラの第２引数)をwindowにするため、
	// window.document === doc の場合はparentWindowではなくwindowを返すようにしている

	// IE8-ではdocument.parentWindow、それ以外はdoc.defaultViewでwindowオブジェクトを取得
	return window.document === doc ? window : doc.defaultView || doc.parentWindow;
}

/**
 * ノードからwindowオブジェクトを取得
 *
 * @private
 * @param {DOM} node
 * @returns {Window} windowオブジェクト
 */
function getWindowOf(node) {
	return getWindowOfDocument(getDocumentOf(node));
}

/**
 * 引数が配列かどうか判定
 * <p>
 * Array.isArrayがあるブラウザの場合はisArray===Array.isArrayです
 * </p>
 *
 * @private
 * @param {Any} obj
 * @returns {Boolean}
 */
var isArray = Array.isArray || (function() {
	// プロパティアクセスを減らすため、toStringをキャッシュ
	var toStringObj = Object.prototype.toString;
	return function(obj) {
		return toStringObj.call(obj) === '[object Array]';
	};
})();

/**
 * 引数が配列かどうか判定
 *
 * @private
 * @param {Any} obj
 * @returns {Boolean}
 */
var isFunction = (function() {
	// Android3以下、iOS4以下は正規表現をtypeofで判定すると"function"を返す
	// それらのブラウザでは、toStringを使って判定する
	if (typeof new RegExp() === 'function') {
		var toStringObj = Object.prototype.toString;
		return function(obj) {
			return toStringObj.call(obj) === '[object Function]';
		};
	}
	// 正規表現のtypeofが"function"にならないブラウザなら、typeofがfunctionなら関数と判定する
	return function(obj) {
		return typeof obj === 'function';
	};
})();

/**
 * 複数のプロミスを待機する機能と、待機中のプロミスを外す機能を提供するクラス
 *
 * @private
 * @class
 * @param promises
 * @param doneCallback
 * @param failCallback
 * @param cfhIfFail
 */
function WaitingPromiseManager(promises, doneCallback, failCallback, cfhIfFail) {
	// 高速化のため、長さ1または0の場合はforを使わずにチェックする
	var length = promises ? promises.length : 0;
	var isPromise = h5.async.isPromise;
	var that = this;
	var resolveArgs = null;
	this._doneCallbackExecuter = function() {
		that._resolved = true;
		if (doneCallback) {
			if (resolveArgs) {
				// resolveArgsを生成している(=複数プロミス)の場合は各doneハンドラの引数を配列にしたものを第1引数に渡す
				doneCallback.call(this, resolveArgs);
			} else {
				// 一つのpromiseにdoneハンドラを引っかけた場合はdoneハンドラの引数をそのままcallbackに渡す
				doneCallback.apply(this, arguments);
			}
		}
	};
	this._failCallbackExecuter = function() {
		that._rejected = true;
		if (failCallback) {
			failCallback.apply(this, arguments);
		} else if (cfhIfFail && h5.settings.commonFailHandler) {
			// failCallbackが渡されていなくてcfhIfFailがtrueでcommonFailHandlerが設定されていればcFHを呼ぶ
			h5.settings.commonFailHandler.call(this, arguments);
		}
	};

	// 高速化のため、長さ１またはプロミスを直接指定の場合はプロミス配列を作らない
	if (length === 1 || isPromise(promises)) {
		var promise = length === 1 ? promises[0] : promises;
		if (!isPromise(promise)) {
			// 長さ1で中身がプロミスでない場合はdoneCallback実行して終了
			this._doneCallbackExecuter();
			return;
		}
		// プロミス配列を作っていない場合のremoveをここで定義(プロトタイプのremoveを上書き)
		this.remove = function(p) {
			if (this._resolved || this._rejected) {
				return;
			}
			if (promise === p) {
				this._doneCallbackExecuter();
			}
		};
		// 長さ1で、それがプロミスなら、そのプロミスにdoneとfailを引っかける
		promise.done(this._doneCallbackExecuter);
		promise.fail(this._failCallbackExecuter);
		return;
	}
	// promisesの中のプロミスオブジェクトの数(プロミスでないものは無視)
	// 引数に渡されたpromisesのうち、プロミスオブジェクトと判定したものを列挙
	var monitoringPromises = [];
	for (var i = 0, l = promises.length; i < l; i++) {
		var p = promises[i];
		if (isPromise(p)) {
			monitoringPromises.push(p);
		}
	}

	var promisesLength = monitoringPromises.length;
	if (promisesLength === 0) {
		// プロミスが一つもなかった場合は即doneCallbackを実行
		this._resolved = true;
		doneCallback && doneCallback();
		return;
	}
	this._promises = monitoringPromises;

	resolveArgs = [];
	this._resolveArgs = [];
	this._resolveCount = 0;
	this._promisesLength = promisesLength;

	// いずれかのpromiseが成功するたびに全て終わったかチェックする関数
	function createCheckFunction(_promise) {
		// いずれかのpromiseが成功するたびに全て終わったかチェックする関数
		return function check(/* var_args */) {
			if (that._rejected) {
				// 既にいずれかがreject済みならなにもしない
				return;
			}
			var arg = h5.u.obj.argsToArray(arguments);
			// 引数無しならundefined、引数が一つならそのまま、引数が2つ以上なら配列を追加
			// ($.when()と同じ)
			var index = $.inArray(_promise, promises);
			resolveArgs[index] = (arg.length < 2 ? arg[0] : arg);

			if (++that._resolveCount === that._promisesLength) {
				// 全てのpromiseが成功したので、doneCallbackを実行
				that._doneCallbackExecuter();
			}
		};
	}

	for (var i = 0; i < promisesLength; i++) {
		var targetPromise = monitoringPromises[i];
		targetPromise.done(createCheckFunction(targetPromise)).fail(this._failCallbackExecuter);
	}
}
WaitingPromiseManager.prototype = $.extend(WaitingPromiseManager.prototype, {
	remove: function(promise) {
		if (this._resolved || this._rejected) {
			return;
		}
		if (promsie === this._promises) {
			this._doneCallback && doneCallback();
			this._resolved = true;
			return;
		}
		var index = $.inArray(promise, this._promises);
		if (index === -1) {
			return;
		}

		// 待機中のpromisesからpromiseを外す
		this._promises.splice(index, 1);
		// 取り除くpromiseについてのresolveArgsを減らす
		this._resolveArgs.splice(index, 1);
		if (isResolved(promise)) {
			// 既にresolve済みなら何もしない
			return;
		}
		// キャッシュしてある待機中プロミスの個数を1減らす
		this._promisesLength--;
		if (that._resolveCount === this._promisesLength) {
			// 現在resolve済みの個数と、1減らした後の待機中プロミス個数が同じならdoneハンドラ実行
			this._doneCallbackExecuter();
		}
	}
});

/**
 * 複数のプロミスが完了するのを待機する
 * <p>
 * whenとは仕様が異なり、新しくdeferredは作らない。
 * </p>
 *
 * @private
 * @param {Promise[]} promises
 * @param {Function} doneCallback doneコールバック
 * @param {Function} failCallback failコールバック
 * @param {Boolean} cfhIfFail 渡されたpromiseのいずれかが失敗した時にcFHを呼ぶかどうか。
 *            cFHを呼ぶときのthisは失敗したpromiseオブジェクト、引数は失敗したpromiseのfailに渡される引数
 * @returns {WaitingPromiseManager}
 */
function waitForPromises(promises, doneCallback, failCallback, cfhIfFail) {
	return new WaitingPromiseManager(promises, doneCallback, failCallback, cfhIfFail);

}

//TODO あるオブジェクト下に名前空間を作ってexposeするようなメソッドを作る
var h5internal = {
	core: {
		controllerInternal: null
	}
};
/* ------ h5.u ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/**
	 * undefinedのタイプ
	 */
	var TYPE_OF_UNDEFINED = 'undefined';

	/**
	 * シリアライザのバージョン
	 */
	var CURRENT_SEREALIZER_VERSION = '2';

	// エラーコード
	/**
	 * ns()、getByPathで引数の名前空間名にstring以外が渡されたときに発生するエラー
	 */
	var ERR_CODE_NAMESPACE_INVALID = 11000;

	/**
	 * expose()で既に存在する名前空間が指定されたときに発生するエラー
	 */
	var ERR_CODE_NAMESPACE_EXIST = 11001;

	/**
	 * serialize()に関数オブジェクトが渡されたときに発生するエラー
	 */
	var ERR_CODE_SERIALIZE_FUNCTION = 11002;

	/**
	 * 現行のバージョンと違うバージョンでserialize()された文字列をdeserialize()しようとしたときに発生するエラー
	 */
	var ERR_CODE_SERIALIZE_VERSION = 11003;

	/**
	 * deserialize()で型情報の判定に失敗したときに発生するエラー
	 */
	var ERR_CODE_DESERIALIZE_TYPE = 11004;

	/**
	 * serialize()に渡されたオブジェクト/配列が循環参照を持つときに発生するエラー
	 */
	var ERR_CODE_CIRCULAR_REFERENCE = 11005;

	/**
	 * deserialize()で値が不正でデシリアライズできない時に発生するエラー
	 */
	var ERR_CODE_DESERIALIZE_VALUE = 11006;

	/**
	 * loadScript()に渡されたパスが不正(文字列以外、空文字、空白文字)である時に発生するエラー
	 */
	var ERR_CODE_INVALID_SCRIPT_PATH = 11007;

	/**
	 * loadScript()に渡されたオプションが不正(プレーンオブジェクト、null、undefined)である時に発生するエラー
	 */
	var ERR_CODE_INVALID_OPTION = 11008;

	/**
	 * deserialize()で引数に文字列でないものを渡されたときのエラー
	 */
	var ERR_CODE_DESERIALIZE_ARGUMENT = 11009;

	/**
	 * loadScript() 読み込みに失敗した場合に発生するエラー
	 */
	var ERR_CODE_SCRIPT_FILE_LOAD_FAILD = 11010;

	// =============================
	// Development Only
	// =============================

	/* del begin */
	/**
	 * 各エラーコードに対応するメッセージ
	 */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_NAMESPACE_INVALID] = '{0} 名前空間の指定が不正です。名前空間として有効な文字列を指定してください。';
	errMsgMap[ERR_CODE_NAMESPACE_EXIST] = '名前空間"{0}"には、プロパティ"{1}"が既に存在します。';
	errMsgMap[ERR_CODE_SERIALIZE_FUNCTION] = 'Function型のオブジェクトは変換できません。';
	errMsgMap[ERR_CODE_SERIALIZE_VERSION] = 'シリアライザのバージョンが違います。シリアライズされたバージョン：{0} 現行のバージョン：{1}';
	errMsgMap[ERR_CODE_DESERIALIZE_TYPE] = '型指定子が不正です。';
	errMsgMap[ERR_CODE_CIRCULAR_REFERENCE] = '循環参照が含まれています。';
	errMsgMap[ERR_CODE_DESERIALIZE_VALUE] = '不正な値が含まれるため、デシリアライズできませんでした。';
	errMsgMap[ERR_CODE_INVALID_SCRIPT_PATH] = 'スクリプトのパスが不正です。空文字以外の文字列、またはその配列を指定して下さい。';
	errMsgMap[ERR_CODE_INVALID_OPTION] = '{0} オプションの指定が不正です。プレーンオブジェクトで指定してください。';
	errMsgMap[ERR_CODE_DESERIALIZE_ARGUMENT] = 'deserialize() 引数の値が不正です。引数には文字列を指定してください。';
	errMsgMap[ERR_CODE_SCRIPT_FILE_LOAD_FAILD] = 'スクリプトファイルの読み込みに失敗しました。URL:{0}';

	// メッセージの登録
	addFwErrorCodeMap(errMsgMap);
	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	/**
	 * loadScript()によって追加されたjsファイルの絶対パスを保持するオブジェクト
	 *
	 * @private
	 */
	var addedJS = {};

	/**
	 * HTMLのエスケープルール
	 *
	 * @private
	 */
	var htmlEscapeRules = {
		'&': '&amp;',
		'"': '&quot;',
		'<': '&lt;',
		'>': '&gt;',
		"'": '&#39;'
	};

	/**
	 * SCRIPTにonloadがあるかどうか
	 *
	 * @private
	 */
	var existScriptOnload = document.createElement('script').onload !== undefined;

	/**
	 * RegExp#toStringで改行文字がエスケープされるかどうか。 IEはtrue
	 *
	 * @private
	 */
	var regToStringEscapeNewLine = new RegExp('\r\n').toString().indexOf('\r\n') === -1;

	// =============================
	// Functions
	// =============================

	/**
	 * 型情報の文字列をコードに変換します。
	 *
	 * @private
	 * @returns {String} 型を表すコード（１字）
	 */
	function typeToCode(typeStr) {
		switch (typeStr) {
		case 'string':
			return 's';
		case 'number':
			return 'n';
		case 'boolean':
			return 'b';
		case 'String':
			return 'S';
		case 'Number':
			return 'N';
		case 'Boolean':
			return 'B';
		case 'infinity':
			return 'i';
		case '-infinity':
			return 'I';
		case 'nan':
			return 'x';
		case 'date':
			return 'd';
		case 'regexp':
			return 'r';
		case 'array':
			return 'a';
		case 'object':
			return 'o';
		case 'null':
			return 'l';
		case TYPE_OF_UNDEFINED:
			return 'u';
		case 'undefElem':
			return '_';
		case 'objElem':
			return '@';
		}
	}

	/**
	 * 文字列中の\(エスケープ文字)とその他特殊文字をエスケープ
	 * <p>
	 * \\, \b, \f, \n, \r, \t をエスケープする
	 * </p>
	 * <p>
	 * http://json.org/json-ja.html に載っているうちの \/ と \" 以外。
	 * </p>
	 * <p>
	 * \/はJSON.stringifyでもエスケープされず、$.parseJSONでは\/も\\/も\/に復元されるので、エスケープしなくてもしてもどちらでもよい。
	 * \"はserialize文字列組立時にエスケープするのでここではエスケープしない。
	 * </p>
	 *
	 * @private
	 * @param {String} str
	 * @param {Boolean} nlEscaped 改行コードがすでにエスケープ済みかどうか。正規表現をtoString()した文字列をエスケープする場合に使用する。
	 *            正規表現をtoString()した場合に改行がエスケープされるブラウザとそうでないブラウザがあるため、改行がescape済みかどうかを引数で取り、
	 *            trueが指定されていた場合は改行以外をエスケープする。
	 * @returns {String} エスケープ後の文字列
	 */
	function escape(str, nlEscaped) {
		if (isString(str)) {
			var ret = str;

			if (nlEscaped) {
				// 改行コードがすでにエスケープ済みの文字列なら、一旦通常の改行コードに戻して、再度エスケープ
				// IEの場合、RegExp#toString()が改行コードをエスケープ済みの文字列を返すため。
				ret = ret.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
			}
			// \b は、バックスペース。正規表現で\bを使うと単語境界を表すが、[\b]と書くとバックスペースとして扱える
			ret = ret.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(
					/[\b]/g, '\\b').replace(/\f/g, '\\f').replace(/\t/g, '\\t');

			return ret;
		}
		if (str instanceof String) {
			return new String(escape(str.toString()));
		}
		return str;
	}

	/**
	 * エスケープされた改行とタブと\(エスケープ文字)をアンエスケープ
	 *
	 * @private
	 * @param {String} str
	 * @param {String} version デシリアライズ対象の文字列がシリアライズされた時のバージョン。'1'ならunescapeしない。
	 * @returns {String} エスケープ後の文字列
	 */
	function unescape(str, version) {
		if (version === '1') {
			return str;
		}
		if (isString(str)) {
			// \に変換する\\は一度'\-'にしてから、改行とタブを元に戻す。
			// '\-'を元に戻す。
			return str.replace(/\\\\/g, '\\-').replace(/\\b/g, '\b').replace(/\\f/g, '\f').replace(
					/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\-/g, '\\');
		}
		if (str instanceof String) {
			return new String(unescape(str.toString()));
		}
		return str;
	}


	/**
	 * 指定されたスクリプトファイルをロードして、スクリプト文字列を取得します。(loadScriptメソッド用)
	 * <p>
	 * dataType:scriptを指定した場合のデフォルトの挙動は、スクリプトファイルの読み込み完了後に$.globalEval()で評価を行うため、
	 * convertersを上書きしています。
	 *
	 * @private
	 * @param {String} url 読み込み対象のスクリプトパス
	 * @param {Boolean} async 非同期でロードを行うか (true:非同期 / false:同期)
	 * @param {Boolean} cache キャッシュされた通信結果が存在する場合、その通信結果を使用するか (true:使用する/false:使用しない)
	 */
	function getScriptString(url, async, cache) {
		var df = h5.async.deferred();
		// 複数のパラメータを配列でまとめて指定できるため、コールバックの実行をresolveWith/rejectWith/notifyWithで行っている
		h5.ajax({
			url: url,
			async: async,
			cache: cache,
			dataType: 'script',
			converters: {
				'text script': function(text) {
					return text;
				}
			}
		}).done(function() {
			var args = argsToArray(arguments);
			args.push(this.url);

			df.notifyWith(df, args);
			df.resolveWith(df, args);
		}).fail(function() {
			df.rejectWith(df, argsToArray(arguments));
		});

		return df.promise();
	}


	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/**
	 * ドット区切りで名前空間オブジェクトを生成します。
	 * （h5.u.obj.ns('sample.namespace')と呼ぶと、window.sample.namespaceとオブジェクトを生成します。）
	 * すでにオブジェクトが存在した場合は、それをそのまま使用します。 引数にString以外、または、識別子として不適切な文字列が渡された場合はエラーとします。
	 *
	 * @param {String} namespace 名前空間
	 * @memberOf h5.u.obj
	 * @returns {Object} 作成した名前空間オブジェクト
	 */
	function ns(namespace) {
		if (!isString(namespace)) {
			// 文字列でないならエラー
			throwFwError(ERR_CODE_NAMESPACE_INVALID, 'h5.u.obj.ns()');
		}

		var nsArray = namespace.split('.');
		var len = nsArray.length;

		for (var i = 0; i < len; i++) {
			if (!isValidNamespaceIdentifier(nsArray[i])) {
				// 名前空間として不正な文字列ならエラー
				throwFwError(ERR_CODE_NAMESPACE_INVALID, 'h5.u.obj.ns()');
			}
		}

		var parentObj = window;
		for (var i = 0; i < len; i++) {
			var name = nsArray[i];
			if (typeof parentObj[name] === TYPE_OF_UNDEFINED) {
				parentObj[name] = {};
			}
			parentObj = parentObj[name];
		}

		// ループが終了しているので、parentObjは一番末尾のオブジェクトを指している
		return parentObj;
	}

	/**
	 * 指定された名前空間に、オブジェクトの各プロパティをそれぞれ対応するキー名で公開（グローバルからたどれる状態に）します。
	 * <p>
	 * <ul>
	 * <li>指定された名前空間が既に存在する場合は、その名前空間に対してプロパティを追加します。</li>
	 * <li>指定された名前空間にプロパティが存在する場合は、『上書きは行われず』例外が発生します。。</li>
	 * </ul>
	 * 実行例:
	 *
	 * <pre>
	 * expose('sample.namespace', {
	 * 	funcA: function() {
	 * 		return 'test';
	 * 	},
	 * 	value1: 10
	 * });
	 * </pre>
	 *
	 * 実行結果:&nbsp;(window.は省略可)<br>
	 * alert(window.sample.namespace.funcA) -&gt; "test"と表示。<br>
	 * alert(window.sample.namespace.value1) -&gt; 10と表示。
	 *
	 * @param {String} namespace 名前空間
	 * @param {Object} obj グローバルに公開したいプロパティをもつオブジェクト
	 * @memberOf h5.u.obj
	 */
	function expose(namespace, obj) {
		var nsObj = ns(namespace);
		for ( var prop in obj) {
			if (obj.hasOwnProperty(prop)) {
				if (nsObj[prop] !== undefined) {
					throwFwError(ERR_CODE_NAMESPACE_EXIST, [namespace, prop]);
				}
				nsObj[prop] = obj[prop];
			}
		}
	}

	/**
	 * 指定されたスクリプトをロードします。
	 *
	 * @param {String|String[]} path ソースパス
	 * @param {Object} [opt] オプション
	 * @param {Boolean} [opt.async] 非同期で読み込むかどうかを指定します。デフォルトはtrue(非同期)です。<br>
	 *            trueの場合、戻り値としてPromiseオブジェクトを返します。<br>
	 *            falseを指定すると同期的に読み込みます（loadScript関数からリターンしたタイミングで、スクリプトは読み込み済みになります）。<br>
	 *            falseの場合、戻り値はありません。<br>
	 *            なお、同期読み込みにすると場合によってはブラウザが固まる等の問題が発生する場合がありますので注意してください。
	 * @param {Boolean} [opt.force] 既に読み込み済みのスクリプトを再度読み込むかどうかを指定します。<br>
	 *            trueの場合、サーバーから最新のスクリプトファイルを取得します。デフォルトはfalse(読み込まない)です。
	 * @param {Boolean} [opt.parallel] 非同期で読み込む場合にパラレルに読み込むかどうかを指定します。<br>
	 *            trueの場合、指定した順番を考慮せずに読み込みます。デフォルトはfalse(シーケンシャルに読み込む)です。<br>
	 *            また、このオプションはasyncオプションがtrue(非同期)のときのみ有効です。
	 * @param {Boolean} [opt.atomic] ファイルの読み込みが全て正常に完了した時点でスクリプトを評価します。デフォルトはfalse(逐次読み込み)です。<br>
	 *            読み込みに失敗したファイルが1つ以上存在する場合、指定した全てのスクリプトがロードされません。
	 * @returns {Any} asyncオプションがtrueの場合はPromiseオブジェクトを、falseの場合は何も返しません。
	 * @name loadScript
	 * @function
	 * @memberOf h5.u
	 */
	function loadScript(path, opt) {
		var getDeferred = h5.async.deferred;
		var resources = wrapInArray(path);

		if (!resources || resources.length === 0) {
			throwFwError(ERR_CODE_INVALID_SCRIPT_PATH);
		}

		for (var i = 0, l = resources.length; i < l; i++) {
			var path = resources[i];
			if (!isString(path) || !$.trim(path)) {
				throwFwError(ERR_CODE_INVALID_SCRIPT_PATH);
			}
		}

		if (opt != null && !$.isPlainObject(opt)) {
			throwFwError(ERR_CODE_INVALID_OPTION, 'h5.u.loadScript()');
		}

		// asyncオプションはデフォルトtrue(非同期)なので、falseが明示的に指定された場合のみfalse(同期)とする
		var async = opt && opt.async === false ? false : true;
		var force = !!(opt && opt.force === true);
		var parallel = !!(opt && opt.parallel === true);
		var atomic = !!(opt && opt.atomic === true);
		// forceオプションがtrue(ロード済みのJSファイルを再度読み込む)の場合、サーバから最新のファイルを取得する
		var cache = !force;

		var retDf = async ? getDeferred() : null;
		var retDfFailCallback = async ? function(url) {
			retDf.reject(createRejectReason(ERR_CODE_SCRIPT_FILE_LOAD_FAILD, [url]));
		} : null;
		var asyncFunc = async ? function() {
			var df = getDeferred();
			setTimeout(function() {
				df.resolve([]);
			}, 0);

			return df.promise();
		} : null;
		var promises = parallel ? [] : null;
		var scriptData = [];
		var loadedUrl = {};

		if (async) {
			// atomicオプションが無効でかつscript.onloadがあるブラウザ(IE6,7,8以外のブラウザ)の場合、SCRIPTタグでスクリプトを動的に読み込む
			// (IE9以降の場合、DocumentModeがQuirksおよび6～8の場合はonloadはundefinedになる)
			if (!atomic && existScriptOnload) {
				var $head = $('head');
				var scriptLoad = function(url) {
					var scriptDfd = getDeferred();
					var script = document.createElement('script');

					script.onload = function() {
						script.onload = null;
						addedJS[url] = url;
						scriptDfd.resolve();
					};
					script.onerror = function() {
						script.onerror = null;
						scriptDfd.reject(url);
					};

					script.type = 'text/javascript';
					// cacheがfalse(最新のJSファイルを取得する)の場合、URLの末尾にパラメータ(+new Date()で、getTime()の値)を付与して常に最新のJSファイルを取得する
					// URLにもともとパラメータが付いていれば、パラメータを追加する。
					script.src = cache ? url : url + ((url.indexOf('?') > -1) ? '&_' : '?_')
							+ (+new Date());
					$head[0].appendChild(script);

					return scriptDfd.promise();
				};

				if (parallel) {
					// 必ず非同期として処理されるようsetTimeout()を処理して強制的に非同期にする
					promises.push(asyncFunc());

					$.each(resources, function() {
						var url = toAbsoluteUrl(this.toString());

						if (!force && url in addedJS) {
							return true;
						}

						promises.push(scriptLoad(url));
					});

					waitForPromises(promises, function() {
						retDf.resolve();
					}, retDfFailCallback);
				} else {
					// 必ず非同期として処理されるようsetTimeout()を処理して強制的に非同期にする
					var seq = thenCompat(getDeferred().resolve(), asyncFunc);

					$.each(resources, function() {
						var url = toAbsoluteUrl(this.toString());

						seq = thenCompat(seq, function() {
							if (!force && url in addedJS) {
								return;
							}
							return scriptLoad(url);
						}, retDfFailCallback);
					});

					thenCompat(seq, function() {
						retDf.resolve();
					}, retDfFailCallback);
				}
			}
			// IE6,7,8の場合、SCRIPTタグのonerrorイベントが発生しないため、読み込みが成功または失敗したか判定できない。
			// よってatomicな読み込みができないため、Ajaxでスクリプトを読み込む
			else {
				if (parallel) {
					var loadedScripts = [];

					// 必ず非同期として処理されるようsetTimeout()を処理して強制的に非同期にする
					promises.push(asyncFunc());
					loadedScripts.push(null);

					$.each(resources, function() {
						var url = toAbsoluteUrl(this.toString());

						if (!force && (url in addedJS || url in loadedUrl)) {
							return true;
						}

						promises.push(getScriptString(url, async, cache));
						atomic ? loadedUrl[url] = url : loadedScripts.push(null);
					});

					var doneCallback = null;
					var progressCallback = null;

					if (atomic) {
						doneCallback = function() {
							$.each(argsToArray(arguments), function(i, e) {
								$.globalEval(e[0]); // e[0] = responseText
							});

							$.extend(addedJS, loadedUrl);
							retDf.resolve();
						};
						progressCallback = $.noop;
					} else {
						doneCallback = function() {
							retDf.resolve();
						};
						progressCallback = function() {
							var results = argsToArray(arguments);

							for (var i = 0; i < loadedScripts.length; i++) {
								var result = results[i];

								if (!result) {
									continue;
								}

								var url = results[i][3]; // results[i][3] = url
								if (loadedScripts[i] === url) {
									continue;
								}

								$.globalEval(results[i][0]); // results[i][0] = responseText
								loadedScripts.splice(i, 1, url);
							}
						};
					}

					h5.async.when(promises).done(doneCallback).fail(retDfFailCallback).progress(
							progressCallback);
				} else {
					// 必ず非同期として処理されるようsetTimeout()を処理して強制的に非同期にする
					var seq = thenCompat(getDeferred().resolve(), asyncFunc);

					$.each(resources, function() {
						var url = toAbsoluteUrl(this.toString());

						seq = thenCompat(seq, function() {
							var df = getDeferred();

							if (!force && (url in addedJS || url in loadedUrl)) {
								df.resolve();
							} else {
								getScriptString(url, async, cache).done(
										function(text, status, xhr) {
											if (atomic) {
												scriptData.push(text);
												loadedUrl[url] = url;
											} else {
												$.globalEval(text);
												addedJS[url] = url;
											}

											df.resolve();
										}).fail(function() {
									df.reject(this.url);
								});
							}

							return df.promise();
						}, retDfFailCallback);
					});

					thenCompat(seq, function() {
						if (atomic) {
							$.each(scriptData, function(i, e) {
								$.globalEval(e);
							});

							$.extend(addedJS, loadedUrl);
						}

						retDf.resolve();
					}, retDfFailCallback);
				}
			}

			return retDf.promise();
		} else {
			$.each(resources, function() {
				var url = toAbsoluteUrl(this.toString());

				if (!force && (url in addedJS || url in loadedUrl)) {
					return true;
				}

				getScriptString(url, async, cache).done(function(text, status, xhr) {
					if (atomic) {
						scriptData.push(text);
						loadedUrl[url] = url;
					} else {
						$.globalEval(text);
						addedJS[url] = url;
					}

				}).fail(function() {
					throwFwError(ERR_CODE_SCRIPT_FILE_LOAD_FAILD, [url]);
				});
			});

			if (atomic) {
				// 読み込みに成功した全てのスクリプトを評価する
				$.each(scriptData, function(i, e) {
					$.globalEval(e);
				});
				$.extend(addedJS, loadedUrl);
			}
			// 同期ロードの場合は何もreturnしない
		}
	}

	/**
	 * 文字列のプレフィックスが指定したものかどうかを返します。
	 *
	 * @param {String} str 文字列
	 * @param {String} prefix プレフィックス
	 * @returns {Boolean} 文字列のプレフィックスが指定したものかどうか
	 * @name startsWith
	 * @function
	 * @memberOf h5.u.str
	 */
	function startsWith(str, prefix) {
		return str.lastIndexOf(prefix, 0) === 0;
	}

	/**
	 * 文字列のサフィックスが指定したものかどうかを返します。
	 *
	 * @param {String} str 文字列
	 * @param {String} suffix サフィックス
	 * @returns {Boolean} 文字列のサフィックスが指定したものかどうか
	 * @name endsWith
	 * @function
	 * @memberOf h5.u.str
	 */
	function endsWith(str, suffix) {
		var sub = str.length - suffix.length;
		return (sub >= 0) && (str.lastIndexOf(suffix) === sub);
	}

	/**
	 * 第一引数の文字列に含まれる{0}、{1}、{2}...{n} (nは数字)を、第2引数以降に指定されたパラメータに置換します。
	 *
	 * <pre>
	 * 例：
	 * 		var myValue = 10;
	 * 		h5.u.str.format('{0} is {1}', 'myValue', myValue);
	 * </pre>
	 *
	 * 実行結果: myValue is 10
	 *
	 * @param {String} str 文字列
	 * @param {Any} var_args 可変長引数
	 * @returns {String} フォーマット済み文字列
	 * @name format
	 * @function
	 * @memberOf h5.u.str
	 */
	function format(str, var_args) {
		if (str == null) {
			return '';
		}
		var args = arguments;
		return str.replace(/\{(\d+)\}/g, function(m, c) {
			var rep = args[parseInt(c, 10) + 1];
			if (typeof rep === TYPE_OF_UNDEFINED) {
				return TYPE_OF_UNDEFINED;
			}
			return rep;
		});
	}

	/**
	 * 指定されたHTML文字列をエスケープします。
	 *
	 * @param {String} str HTML文字列
	 * @returns {String} エスケープ済HTML文字列
	 * @name escapeHtml
	 * @function
	 * @memberOf h5.u.str
	 */
	function escapeHtml(str) {
		if ($.type(str) !== 'string') {
			return str;
		}
		return str.replace(/[&"'<>]/g, function(c) {
			return htmlEscapeRules[c];
		});
	}

	/**
	 * オブジェクトを、型情報を付与した文字列に変換します。
	 * <p>
	 * このメソッドが判定可能な型は、以下のとおりです。
	 * <ul>
	 * <li>string(文字列)
	 * <li>number(数値)
	 * <li>boolean(真偽値)
	 * <li>String(文字列のラッパークラス型)
	 * <li>Number(数値のラッパークラス型)
	 * <li>Boolean(真偽値のラッパークラス型)
	 * <li>array(配列)
	 * <li>object(プレーンオブジェクト [new Object() または {…} のリテラルで作られたオブジェクト])
	 * <li>Date(日付)
	 * <li>RegExp(正規表現)
	 * <li>undefined
	 * <li>null
	 * <li>NaN
	 * <li>Infinity
	 * <li>-Infinity
	 * </ul>
	 * <p>
	 * このメソッドで文字列化したオブジェクトは<a href="#deserialize">deseriarize</a>メソッドで元に戻すことができます。
	 * </p>
	 * <p>
	 * object型はプレーンオブジェクトとしてシリアライズします。 渡されたオブジェクトがプレーンオブジェクトで無い場合、そのprototypeやconstructorは無視します。
	 * </p>
	 * <p>
	 * array型は連想配列として保持されているプロパティもシリアライズします。
	 * </p>
	 * <p>
	 * 循環参照を含むarray型およびobject型はシリアライズできません。例外をスローします。
	 * </p>
	 * <p>
	 * 内部に同一インスタンスを持つarray型またはobject型は、別インスタンスとしてシリアライズします。以下のようなarray型オブジェクトaにおいて、a[0]とa[1]が同一インスタンスであるという情報は保存しません。
	 *
	 * <pre>
	 * a = [];
	 * a[0] = a[1] = [];
	 * </pre>
	 *
	 * </p>
	 * <h4>注意</h4>
	 * <p>
	 * function型のオブジェクトは<b>変換できません</b>。例外をスローします。
	 * array型にfunction型のオブジェクトが存在する場合は、undefinedとしてシリアライズします。object型または連想配列にfunction型のオブジェクトが存在する場合は、無視します。
	 * </p>
	 *
	 * @param {Object} value オブジェクト
	 * @returns {String} 型情報を付与した文字列
	 * @name serialize
	 * @function
	 * @memberOf h5.u.obj
	 */
	function serialize(value) {
		if (isFunction(value)) {
			throwFwError(ERR_CODE_SERIALIZE_FUNCTION);
		}
		// 循環参照チェック用配列
		var objStack = [];
		function existStack(obj) {
			for (var i = 0, len = objStack.length; i < len; i++) {
				if (obj === objStack[i]) {
					return true;
				}
			}
			return false;
		}

		function popStack(obj) {
			for (var i = 0, len = objStack.length; i < len; i++) {
				if (obj === objStack[i]) {
					objStack.splice(i, 1);
				}
			}
		}

		function func(val) {
			var ret = val;
			var type = $.type(val);

			// プリミティブラッパークラスを判別する
			if (typeof val === 'object') {
				if (val instanceof String) {
					type = 'String';
				} else if (val instanceof Number) {
					type = 'Number';
				} else if (val instanceof Boolean) {
					type = 'Boolean';
				}
			}

			// オブジェクトや配列の場合、JSON.stringify()を使って書けるが、json2.jsのJSON.stringify()を使った場合に不具合があるため自分で実装した。
			switch (type) {
			case 'String':
				// stringの場合と同じ処理を行うため、breakしない
			case 'string':
				// String、string、両方の場合について同じ処理を行う
				// typeToCodeはStringなら'S'、stringなら's'を返し、区別される
				ret = typeToCode(type) + escape(ret);
				break;
			case 'Boolean':
				// String/stringの場合と同様に、Boolean/booleanでも同じ処理を行うためbreakしていないが、
				// Boolean型の場合はvalueOfで真偽値を取得する
				ret = ret.valueOf();
			case 'boolean':
				// Booleanの場合は'B0','B1'。booleanの場合は'b0','b1'に変換する
				ret = typeToCode(type) + ((ret) ? 1 : 0);
				break;
			case 'Number':
				ret = ret.valueOf();
				if (($.isNaN && $.isNaN(val)) || ($.isNumeric && !$.isNumeric(val))) {
					if (val.valueOf() === Infinity) {
						ret = typeToCode('infinity');
					} else if (val.valueOf() === -Infinity) {
						ret = typeToCode('-infinity');
					} else {
						ret = typeToCode('nan');
					}
				}
				ret = typeToCode(type) + ret;
				break;
			case 'number':
				if (($.isNaN && $.isNaN(val)) || ($.isNumeric && !$.isNumeric(val))) {
					if (val === Infinity) {
						ret = typeToCode('infinity');
					} else if (val === -Infinity) {
						ret = typeToCode('-infinity');
					} else {
						ret = typeToCode('nan');
					}
				} else {
					ret = typeToCode(type) + ret;
				}
				break;
			case 'regexp':
				ret = typeToCode(type) + escape(ret.toString(), regToStringEscapeNewLine);
				break;
			case 'date':
				ret = typeToCode(type) + (+ret);
				break;
			case 'array':
				if (existStack(val)) {
					throwFwError(ERR_CODE_REFERENCE_CYCLE);
				}
				objStack.push(val);
				var indexStack = [];
				ret = typeToCode(type) + '[';
				for (var i = 0, len = val.length; i < len; i++) {
					indexStack[i.toString()] = true;
					var elm;
					if (!val.hasOwnProperty(i)) {
						elm = typeToCode('undefElem');
					} else if ($.type(val[i]) === 'function') {
						elm = typeToCode(TYPE_OF_UNDEFINED);
					} else {
						elm = (func(val[i])).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
					}
					ret += '"' + elm + '"';
					if (i !== val.length - 1) {
						ret += ',';
					}
				}
				var hash = '';
				for ( var key in val) {
					if (indexStack[key]) {
						continue;
					}
					if ($.type(val[key]) !== 'function') {
						hash += '"' + escape(key) + '":"'
								+ (func(val[key])).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
								+ '",';
					}
				}
				if (hash) {
					ret += ((val.length) ? ',' : '') + '"' + typeToCode('objElem') + '{'
							+ hash.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
					ret = ret.replace(/,$/, '');
					ret += '}"';
				}
				ret += ']';
				popStack(val);
				break;
			case 'object':
				if (existStack(val)) {
					throwFwError(ERR_CODE_CIRCULAR_REFERENCE);
				}
				objStack.push(val);
				ret = typeToCode(type) + '{';
				for ( var key in val) {
					if (val.hasOwnProperty(key)) {
						if ($.type(val[key]) === 'function') {
							continue;
						}
						ret += '"' + key + '":"'
								+ (func(val[key])).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
								+ '",';
					}
				}
				ret = ret.replace(/,$/, '');
				ret += '}';
				popStack(val);
				break;
			case 'null':
			case TYPE_OF_UNDEFINED:
				ret = typeToCode(type);
				break;
			}

			return ret;
		}

		return CURRENT_SEREALIZER_VERSION + '|' + func(value);
	}

	/**
	 * 型情報が付与された文字列をオブジェクトを復元します。
	 *
	 * @param {String} value 型情報が付与された文字列
	 * @returns {Any} 復元されたオブジェクト
	 * @name deserialize
	 * @function
	 * @memberOf h5.u.obj
	 */
	function deserialize(value) {
		if (!isString(value)) {
			throwFwError(ERR_CODE_DESERIALIZE_ARGUMENT);
		}

		value.match(/^(.)\|(.*)/);
		var version = RegExp.$1;
		// version1の場合はエラーにせず、現在のバージョンでunescapeをしない方法で対応している。
		if (version !== '1' && version !== CURRENT_SEREALIZER_VERSION) {
			throwFwError(ERR_CODE_SERIALIZE_VERSION, [version, CURRENT_SEREALIZER_VERSION]);
		}
		var ret = RegExp.$2;

		function func(val) {
			/**
			 * 型情報のコードを文字列に変換します。
			 *
			 * @private
			 * @returns {String} 型を表す文字列
			 */
			function codeToType(typeStr) {
				switch (typeStr) {
				case 's':
					return 'string';
				case 'n':
					return 'number';
				case 'b':
					return 'boolean';
				case 'S':
					return 'String';
				case 'N':
					return 'Number';
				case 'B':
					return 'Boolean';
				case 'i':
					return 'infinity';
				case 'I':
					return '-infinity';
				case 'x':
					return 'nan';
				case 'd':
					return 'date';
				case 'r':
					return 'regexp';
				case 'a':
					return 'array';
				case 'o':
					return 'object';
				case 'l':
					return 'null';
				case 'u':
					return TYPE_OF_UNDEFINED;
				case '_':
					return 'undefElem';
				case '@':
					return 'objElem';
				}
			}
			val.match(/^(.)(.*)/);
			var type = RegExp.$1;
			ret = (RegExp.$2) ? RegExp.$2 : '';
			if (type !== undefined && type !== '') {
				switch (codeToType(type)) {
				case 'String':
					ret = new String(unescape(ret, version));
					break;
				case 'string':
					break;
				case 'Boolean':
					if (ret === '0' || ret === '1') {
						ret = new Boolean(ret === '1');
					} else {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					break;
				case 'boolean':
					if (ret === '0' || ret === '1') {
						ret = ret === '1';
					} else {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					break;
				case 'nan':
					if (ret !== '') {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					ret = NaN;
					break;
				case 'infinity':
					if (ret !== '') {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					ret = Infinity;
					break;
				case '-infinity':
					if (ret !== '') {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					ret = -Infinity;
					break;
				case 'Number':
					if (codeToType(ret) === 'infinity') {
						ret = new Number(Infinity);
					} else if (codeToType(ret) === '-infinity') {
						ret = new Number(-Infinity);
					} else if (codeToType(ret) === 'nan') {
						ret = new Number(NaN);
					} else {
						ret = new Number(ret);
						if (isNaN(ret.valueOf())) {
							throwFwError(ERR_CODE_DESERIALIZE_VALUE);
						}
					}
					break;
				case 'number':
					ret = new Number(ret).valueOf();
					if (isNaN(ret)) {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					break;
				case 'array':
					var obj;
					try {
						obj = $.parseJSON(ret);
					} catch (e) {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					if (!isArray(obj)) {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					for (var i = 0; i < obj.length; i++) {
						switch (codeToType(obj[i].substring(0, 1))) {
						case 'undefElem':
							delete obj[i];
							break;
						case 'objElem':
							var extendObj = func(typeToCode('object') + obj[i].substring(1));
							var tempObj = [];
							for (var i = 0, l = obj.length - 1; i < l; i++) {
								tempObj[i] = obj[i];
							}
							obj = tempObj;
							for ( var key in extendObj) {
								obj[key] = extendObj[key];
							}
							break;
						default:
							obj[i] = func(obj[i]);
						}
					}
					ret = obj;
					break;
				case 'object':
					var obj;
					try {
						obj = $.parseJSON(ret);
					} catch (e) {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					if (!$.isPlainObject(obj)) {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					for ( var key in obj) {
						obj[key] = func(obj[key]);
					}
					ret = obj;
					break;
				case 'date':
					ret = new Date(parseInt(ret, 10));
					break;
				case 'regexp':
					try {
						var matchResult = ret.match(/^\/(.*)\/(.*)$/);
						var regStr = unescape(matchResult[1], version);
						var flg = matchResult[2];
						ret = new RegExp(regStr, flg);
					} catch (e) {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					break;
				case 'null':
					if (ret !== '') {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					ret = null;
					break;
				case TYPE_OF_UNDEFINED:
					if (ret !== '') {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					ret = undefined;
					break;
				default:
					throwFwError(ERR_CODE_DESERIALIZE_TYPE);
				}
			}

			return unescape(ret, version);
		}
		return func(ret);
	}

	/**
	 * オブジェクトがjQueryオブジェクトかどうかを返します。
	 *
	 * @param {Object} obj オブジェクト
	 * @returns {Boolean} jQueryオブジェクトかどうか
	 * @name isJQueryObject
	 * @function
	 * @memberOf h5.u.obj
	 */
	function isJQueryObject(obj) {
		if (!obj || !obj.jquery) {
			return false;
		}
		return (obj.jquery === $().jquery);
	}

	/**
	 * argumentsを配列に変換します。
	 *
	 * @param {Arguments} args Arguments
	 * @returns {Any[]} argumentsを変換した配列
	 * @name argsToArray
	 * @function
	 * @memberOf h5.u.obj
	 */
	function argsToArray(args) {
		return Array.prototype.slice.call(args);
	}

	/**
	 * 指定された名前空間に存在するオブジェクトを取得します。
	 *
	 * @param {String} namespace 名前空間
	 * @param {Object} [rootObj=window] 名前空間のルートとなるオブジェクト。デフォルトはwindowオブジェクト。
	 * @returns {Any} その名前空間に存在するオブジェクト
	 * @name getByPath
	 * @function
	 * @memberOf h5.u.obj
	 */
	function getByPath(namespace, rootObj) {
		if (!isString(namespace)) {
			throwFwError(ERR_CODE_NAMESPACE_INVALID, 'h5.u.obj.getByPath()');
		}

		var names = namespace.split('.');
		var idx = 0;
		if (names[0] === 'window' && (!rootObj || rootObj === window)) {
			// rootObjが未指定またはwindowオブジェクトの場合、namespaceの最初のwindow.は無視する
			idx = 1;
		}
		var ret = rootObj || window;
		for (var len = names.length; idx < len; idx++) {
			ret = ret[names[idx]];
			if (ret == null) { // nullまたはundefinedだったら辿らない
				break;
			}
		}
		return ret;
	}

	/**
	 * インターセプタを作成します。
	 *
	 * @param {Function} pre インターセプト先関数の実行前に呼ばれる関数です。
	 * @param {Function} post インターセプト先関数の実行後に呼ばれる関数です。<br />
	 *            <ul>
	 *            <li><code>pre(),post()には引数としてinvocation(インターセプト対象の関数についてのオブジェクト)と
	 *            data(preからpostへ値を渡すための入れ物オブジェクト)が渡されます。</li>
	 *            <li>invocationは以下のプロパティを持つオブジェクトです。
	 *            <dl>
	 *            <dt>target</dt>
	 *            <dd>インターセプト対象の関数が属しているコントローラまたはロジック</dd>
	 *            <dt>func</dt>
	 *            <dd>インターセプト対象の関数</dd>
	 *            <dt>funcName</dt>
	 *            <dd>インターセプト対象の関数名</dd>
	 *            <dt>args</dt>
	 *            <dd>関数が呼ばれたときに渡された引数(argumentsオブジェクト)</dd>
	 *            <dt>proceed</dt>
	 *            <dd>インターセプト対象の関数を実行する関数。インターセプト対象の関数は自動では実行されません。 インターセプト先の関数を実行するには、
	 *            <code>pre</code>に指定した関数内で<code>invocation.proceed()</code>を呼んでください。
	 *            <code>proceed()</code>を呼ぶと対象の関数(<code>invocation.func</code>)を呼び出し時の引数(<code>invocation.args</code>)で実行します。
	 *            <code>proceed</code>自体は引数を取りません。</dd>
	 *            </dl>
	 *            </li>
	 *            <li>post()は、呼び出した関数の戻り値がPromiseオブジェクトかどうかをチェックし、Promiseオブジェクトの場合は対象のDeferredが完了した後に呼ばれます。</li>
	 *            <li>pre()の中でinvocation.proceed()が呼ばれなかった場合、post()は呼ばれません。</li>
	 *            <li>invocation.resultプロパティに呼び出した関数の戻り値が格納されます。</li>
	 *            <li>pre()が指定されていない場合、invocation.proceed()を実行した後にpost()を呼びます。</li>
	 *            </ul>
	 *            コード例(h5.core.interceptor.lapInterceptor)を以下に示します。<br />
	 *
	 * <pre>
	 * var lapInterceptor = h5.u.createInterceptor(function(invocation, data) {
	 * 	// 開始時間をdataオブジェクトに格納
	 * 		data.start = new Date();
	 * 		// invocationを実行
	 * 		return invocation.proceed();
	 * 	}, function(invocation, data) {
	 * 		// 終了時間を取得
	 * 		var end = new Date();
	 * 		// ログ出力
	 * 		this.log.info('{0} &quot;{1}&quot;: {2}ms', this.__name, invocation.funcName, (end - data.start));
	 * 	});
	 * </pre>
	 *
	 * @returns {Function} インターセプタ
	 * @name createInterceptor
	 * @function
	 * @memberOf h5.u
	 */
	function createInterceptor(pre, post) {
		return function(invocation) {
			var data = {};
			var ret = pre ? pre.call(this, invocation, data) : invocation.proceed();
			invocation.result = ret;
			if (!post) {
				return ret;
			}
			if (ret && isFunction(ret.promise) && !isJQueryObject(ret)) {
				var that = this;

				registerCallbacksSilently(ret, 'always', function() {
					post.call(that, invocation, data);
				});

				return ret;
			}
			post.call(this, invocation, data);
			return ret;
		};
	}

	// =============================
	// Expose to window
	// =============================

	expose('h5.u', {
		loadScript: loadScript,
		createInterceptor: createInterceptor
	});

	/**
	 * @namespace
	 * @name str
	 * @memberOf h5.u
	 */
	expose('h5.u.str', {
		startsWith: startsWith,
		endsWith: endsWith,
		format: format,
		escapeHtml: escapeHtml
	});

	/**
	 * @namespace
	 * @name obj
	 * @memberOf h5.u
	 */
	expose('h5.u.obj', {
		expose: expose,
		ns: ns,
		serialize: serialize,
		deserialize: deserialize,
		isJQueryObject: isJQueryObject,
		argsToArray: argsToArray,
		getByPath: getByPath
	});
})();
/* ------ h5.mixin ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	// -------------------------------
	// エラーコード
	// -------------------------------
	/** addEventListenerに不正な引数が渡された */
	var ERR_CODE_INVALID_ARGS_ADDEVENTLISTENER = 16000;

	// =============================
	// Development Only
	// =============================

	/* del begin */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_INVALID_ARGS_ADDEVENTLISTENER] = 'addEventListenerには、イベント名(文字列)、イベントリスナ(関数)を渡す必要があります。';

	// メッセージの登録
	addFwErrorCodeMap(errMsgMap);
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	// =============================
	// Functions
	// =============================
	/**
	 * 受け取ったオブジェクトをイベントオブジェクトにする
	 *
	 * @private
	 * @param {Object} event 任意のオブジェクト
	 * @param {Object} target event.targetになるオブジェクト
	 * @returns {Object} イベントオブジェクト
	 */
	function setEventProperties(event, target) {
		// ターゲットの追加
		if (!event.target) {
			event.target = target;
		}
		// タイムスタンプの追加
		if (!event.timeStamp) {
			event.timeStamp = new Date().getTime();
		}

		// isDefaultPreventedがないなら、isDefaultPrevented()とpreventDefault()を追加
		if (!event.isDefaultPrevented) {
			var _isDefaultPrevented = false;
			event.isDefaultPrevented = function() {
				return _isDefaultPrevented;
			};
			event.preventDefault = function() {
				_isDefaultPrevented = true;
			};
		}

		// isImmediatePropagationStoppedがないなら、isImmediatePropagationStopped()とstopImmediatePropagation()を追加
		if (!event.isImmediatePropagationStopped) {
			var _isImmediatePropagationStopped = false;
			event.isImmediatePropagationStopped = function() {
				return _isImmediatePropagationStopped;
			};
			event.stopImmediatePropagation = function() {
				_isImmediatePropagationStopped = true;
			};
		}
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	/**
	 * Mixinのコンストラクタ
	 * <p>
	 * このクラスは自分でnewすることはありません。
	 * h5.mixin.createMixin(moduleObject)を呼ぶと渡されたモジュールオブジェクトについてのMixinインスタンスを返します。
	 * </p>
	 * <p>
	 * 作製したインスタンスの<a href="Mixin.html#mix">mix()</a>を呼ぶと、モジュールオブジェクトとmixの引数に渡されたオブジェクトをミックスインしたオブジェクトを返します。
	 * </p>
	 *
	 * <pre><code>
	 * // set,getメソッドを持つモジュールオブジェクトのmixinを作成する例
	 * var mixin = h5.mixin.createMixin({
	 * 	set: function(p, v) {
	 * 		this[p] = v;
	 * 	},
	 * 	get: function(p) {
	 * 		return this[p];
	 * 	}
	 * });
	 * var target = {
	 * 	hoge: 'abc'
	 * };
	 * mixin.mix(target);
	 * mixin.get('hoge'); // 'abc'が返る
	 * </code></pre>
	 *
	 * <p>
	 * <a href="h5.mixin.html">h5.mixin</a>以下にこのクラスを実装したインスタンスを配置しています。
	 * </p>
	 *
	 * @class Mixin
	 */
	/**
	 * @private
	 * @param moduleObject mixinする元となるモジュールオブジェクト
	 */
	function Mixin(moduleObject) {
		// moduleObjectのプロパティキャッシュを作成
		var props = {};
		for ( var p in moduleObject) {
			var v = moduleObject[p];
			// hasOwnPropertyがtrueでなければコピーしない
			// 関数、null、文字列リテラル、数値リテラル、真偽値リテラルのいずれかの場合のみコピー
			if (moduleObject.hasOwnProperty(p)
					&& (isFunction(v) || v === null || typeof v === 'string'
							|| typeof v === 'number' || typeof v === 'boolean')) {
				props[p] = v;
			}
		}

		// mix, hasInterfaceはMixinのprototypeに持たせていて、それぞれインスタンスが持つ_mix, _hasInterfaceを呼んでいる
		// _mix, _hasInterfaceはmoduleObjectのプロパティキャッシュを参照したいため、Mixinインスタンスごとに定義している
		this._mix = function(target) {
			for ( var p in props) {
				// targetがもともと持っていたプロパティがあっても上書き
				target[p] = props[p];
			}
		};

		this._hasInterface = function(object) {
			for ( var p in props) {
				// プライベートなものはチェックしない
				if (h5.u.str.startsWith(p, '_')) {
					continue;
				}
				// hasOwnPropertyがtrueかどうかは判定せず、プロトタイプチェーン上にあってもよい
				// undefinedでなければそのプロパティを持っていると判定する
				if (typeof object[p] === TYPE_OF_UNDEFINED) {
					return false;
				}
			}
			return true;
		};
	}

	$.extend(Mixin.prototype, {
		/**
		 * 引数に渡されたオブジェクトと、モジュールオブジェクトとのミックスインを作成します。
		 * <p>
		 * 関数、null、文字列リテラル、数値リテラル、真偽値リテラルのいずれかの値を持つプロパティについてのみミックスインを行います。
		 * </p>
		 *
		 * @memberOf Mixin
		 * @prop {Object} target
		 */
		mix: function(target) {
			return this._mix(target);
		},
		/**
		 * 引数に渡されたオブジェクトが、モジュールオブジェクトを実装しているかどうか判定します。
		 * <p>
		 * 関数、null、文字列リテラル、数値リテラル、真偽値リテラルのいずれかの値を持つモジュールオブジェクトのプロパティを、
		 * 引数に渡されたobjectが全て持っているならtrue、そうでないならfalseを返します。
		 * </p>
		 * <p>
		 * ただしモジュールオブジェクトで定義されたプライベートメンバ("_"始まり)のプロパティについてはチェックしません。
		 * </p>
		 *
		 * @memberOf Mixin
		 * @prop {Object} object
		 * @returns {Boolean}
		 */
		hasInterface: function(object) {
			return this._hasInterface(object);
		}
	});

	function createMixin(moduleObject) {
		return new Mixin(moduleObject);
	}

	//-------------------------------------------
	//EventDispatcher
	//-------------------------------------------
	/**
	 * イベントディスパッチャ
	 * <p>
	 * イベントリスナを管理するクラスです。このクラスはnewできません。
	 * </p>
	 * <p>
	 * このモジュールをミックスインしたオブジェクトを作成したい場合は、<a
	 * href="h5.mixin.html#eventDispatcher">h5.mixin.eventDispatcher</a>の<a
	 * href="Mixin.html#mix">mix()</a>メソッドを使用してください。
	 * </p>
	 * <p>
	 * 以下のクラスがイベントディスパッチャのメソッドを持ちます。
	 * <ul>
	 * <li><a href="ObservableArray.html">ObservableArray</a>
	 * <li><a href="ObservableItem.html">ObservableItem</a>
	 * <li><a href="DataModelManager.html">DataModelManager</a>
	 * <li><a href="DataModel.html">DataModel</a>
	 * <li><a href="DataItem.html">DataItem</a>
	 * </ul>
	 * </p>
	 *
	 * @mixin
	 * @name EventDispatcher
	 */
	var eventDispatcherModule = {
		/**
		 * イベントリスナが登録されているかどうかを返します
		 * <p>
		 * 第一引数にイベント名、第二引数にイベントリスナを渡し、指定したイベントに指定したイベントリスナが登録済みかどうかを返します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf EventDispatcher
		 * @param {String} type イベント名
		 * @param {Function} listener イベントリスナ
		 * @returns {Boolean} 第一引数のイベント名に第二引数のイベントリスナが登録されているかどうか
		 */
		hasEventListener: function(type, listener) {
			if (!this._eventListeners) {
				return false;
			}
			var l = this._eventListeners[type];
			if (!l || !this._eventListeners.hasOwnProperty(type)) {
				return false;
			}

			for (var i = 0, count = l.length; i < count; i++) {
				if (l[i] === listener) {
					return true;
				}
			}
			return false;
		},

		/**
		 * イベントリスナを登録します。
		 * <p>
		 * 第一引数にイベント名、第二引数にイベントリスナを渡し、イベントリスナを登録します。指定したイベントが起こった時にイベントリスナが実行されます。
		 * </p>
		 * <p>
		 * イベントリスナは、関数または<a
		 * href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-EventListener">EventListener</a>
		 * インタフェースを実装するオブジェクト(handleEventプロパティに関数を持つオブジェクト)で指定できます。
		 * <p>
		 * 指定したイベントに、指定したイベントリスナが既に登録されていた場合は何もしません。
		 * </p>
		 * <p>
		 * 同一のイベントに対して複数回addEventListener()を呼び、複数のイベントリスナを登録した場合は、イベント発火時に登録した順番に実行されます。
		 * </p>
		 * <p>
		 * 第３引数以降が指定されていても無視されます。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf EventDispatcher
		 * @param {String} type イベント名
		 * @param {Function|Object} listener イベントリスナまたはhandleEventを持つイベントリスナオブジェクト
		 */
		addEventListener: function(type, listener) {
			// 引数チェック
			// typeは文字列で、第2引数まで指定されていることをチェックする
			// listenerが関数またはイベントリスナオブジェクトかどうかは、実行時に判定し、関数でもイベントリスナオブジェクトでもない場合は実行しない
			if (arguments.length < 2 || !isString(type)) {
				throwFwError(ERR_CODE_INVALID_ARGS_ADDEVENTLISTENER);
			}
			if (listener == null || this.hasEventListener(type, listener)) {
				// nullまたはundefinedが指定されている、または既に登録済みのイベントリスナなら何もしない
				return;
			}

			if (!this._eventListeners) {
				this._eventListeners = {};
			}

			if (!(this._eventListeners.hasOwnProperty(type))) {
				this._eventListeners[type] = [];
			}

			this._eventListeners[type].push(listener);
		},

		/**
		 * イベントリスナを削除します。
		 * <p>
		 * 第一引数にイベント名、第二引数にイベントリスナを渡し、指定したイベントから指定したイベントリスナを削除します。
		 * </p>
		 * <p>
		 * 指定したイベント名に指定したイベントリスナが登録されていない場合は何もしません。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf EventDispatcher
		 * @param {String} type イベント名
		 * @param {Function} listener イベントリスナ
		 */
		removeEventListener: function(type, listener) {
			if (!this.hasEventListener(type, listener)) {
				return;
			}

			var l = this._eventListeners[type];

			for (var i = 0, count = l.length; i < count; i++) {
				if (l[i] === listener) {
					l.splice(i, 1);
					return;
				}
			}
		},

		/**
		 * イベントをディスパッチします
		 * <p>
		 * イベントオブジェクトを引数に取り、そのevent.typeに登録されているイベントリスナを実行します。
		 * イベントオブジェクトにpreventDefault()関数を追加してイベントリスナの引数に渡して呼び出します。
		 * </p>
		 * <p>
		 * 戻り値は『イベントリスナ内でpreventDefault()が呼ばれたかどうか』を返します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf EventDispatcher
		 * @param {Object} event イベントオブジェクト
		 * @returns {Boolean} イベントリスナ内でpreventDefault()が呼ばれたかどうか。
		 */
		dispatchEvent: function(event) {
			if (!this._eventListeners) {
				return;
			}
			var l = this._eventListeners[event.type];
			if (!l) {
				return;
			}
			// リスナをslice(0)して、dispatchEventを呼んだ瞬間にどのリスナが呼ばれるか確定させる
			// (あるイベントのイベントリスナの中でadd/removeEventListenerされても、そのイベントが実行するイベントリスナには影響ない)
			l = l.slice(0);

			setEventProperties(event, this);

			// リスナーを実行。stopImmediatePropagationが呼ばれていたらそこでループを終了する。
			for (var i = 0, count = l.length; i < count && !event.isImmediatePropagationStopped(); i++) {
				if (isFunction(l[i])) {
					l[i].call(event.target, event);
				} else if (l[i].handleEvent) {
					// イベントリスナオブジェクトの場合はhandleEventを呼ぶ
					// handleEvent内のコンテキストはイベントリスナオブジェクトなので、callは使わずにそのまま呼び出す
					l[i].handleEvent(event);
				}
			}

			return event.isDefaultPrevented();
		}
	};

	// =============================
	// Expose to window
	// =============================

	/**
	 * @namespace h5.mixin
	 */
	h5.u.obj.expose('h5.mixin', {
		/**
		 * Mixinクラスを引数に渡されたモジュールオブジェクトから作成します。
		 * <p>
		 * 作成したMixinクラスはモジュールオブジェクトとのmixinを行うクラスになります。 Mixinクラスについては<a href="Mixin.html">こちら</a>をご覧ください。
		 * </p>
		 *
		 * @since 1.1.10
		 * @memberOf h5.mixin
		 * @param {Object} moduleObject モジュールオブジェクト。mixinの元となるオブジェクト
		 * @returns {Mixin} モジュールオブジェクトをもとに生成したMixinオブジェクト
		 */
		createMixin: createMixin,

		/**
		 * EventDispatcherのMixin
		 * <p>
		 * EventDispatcherのMixinです。このクラスが持つmix()メソッドを呼ぶと、オブジェクトにEventDispatcherの機能が追加されます。
		 * </p>
		 * <p>
		 * Mixinクラスについては<a href="Mixin.html">こちら</a>をご覧ください。
		 * </p>
		 * <p>
		 * EventDispatcherクラスについては<a href="EventDispatcher.html">こちら</a>をご覧ください。
		 * </p>
		 *
		 * @since 1.1.10
		 * @memberOf h5.mixin
		 * @type {Mixin}
		 * @name eventDispatcher
		 */
		eventDispatcher: createMixin(eventDispatcherModule)
	});
})();
/* ------ h5.log ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	// エラーコード
	/**
	 * ログターゲット(targets)の指定が不正なときのエラーコード
	 */
	var ERR_CODE_LOG_TARGET_TYPE = 10000;

	/*
	 * out.categoryのが指定されていないときのエラーコード
	 * ERR_CODE_OUT_CATEGORY_INVALIDに統合したためver.1.1.0で廃止
	 * var ERR_CODE_OUT_CATEGORY_IS_NONE = 10001;
	 */

	/*
	 * カテゴリが複数回指定されたときのエラーコード
	 * 出力定義にマッチするかどうかは、カテゴリ名に加えてレベルしても判定するようになったので1.1.15で廃止 #410
	 * var ERR_CODE_CATEGORY_NAMED_MULTIPLE_TIMES = 10002;
	 */

	/**
	 * ログレベルの指定が不正なときのエラーコード
	 */
	var ERR_CODE_LEVEL_INVALID = 10003;

	/**
	 * 存在しないログターゲットを指定されたときのエラーコード
	 */
	var ERR_CODE_LOG_TARGETS_IS_NONE = 10004;

	/**
	 * カテゴリに文字列以外または空文字を指定したときのエラーコード
	 */
	var ERR_CODE_CATEGORY_INVALID = 10005;

	/**
	 * ログターゲット(targets)が複数回指定されたときのエラーコード
	 */
	var ERR_CODE_LOG_TARGETS_NAMED_MULTIPLE_TIMES = 10007;

	/**
	 * ログターゲット(targets)に文字列以外または空文字を指定されたときのエラーコード
	 */
	var ERR_CODE_LOG_TARGETS_INVALID = 10008;

	/**
	 * ログターゲット(target)にオブジェクト以外を指定されたときのエラーコード
	 */
	var ERR_CODE_LOG_TARGET_INVALID = 10009;

	/**
	 * out.categoryが指定されていないときのエラーコード
	 */
	var ERR_CODE_OUT_CATEGORY_INVALID = 10010;

	/**
	 * スタックトレース出力時に1行目(メッセージ部)に表示するトレース件数
	 */
	var PREVIEW_TRACE_COUNT = 3;

	// =============================
	// Development Only
	// =============================

	/* del begin */
	/**
	 * 各エラーコードに対応するメッセージ
	 */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_LOG_TARGET_TYPE] = 'ログターゲットのtypeには、オブジェクト、もしくは"console"のみ指定可能です。';
	errMsgMap[ERR_CODE_LEVEL_INVALID] = 'level"{0}"の指定は不正です。Number、もしくはtrace, info, debug, warn, error, noneを指定してください。';
	errMsgMap[ERR_CODE_LOG_TARGETS_NAMED_MULTIPLE_TIMES] = 'ログターゲット"{0}"が複数回指定されています。';
	errMsgMap[ERR_CODE_LOG_TARGETS_IS_NONE] = '"{0}"という名前のログターゲットはありません。';
	errMsgMap[ERR_CODE_CATEGORY_INVALID] = 'categoryは必須項目です。空文字で無い文字列を指定して下さい。';
	errMsgMap[ERR_CODE_LOG_TARGETS_INVALID] = 'ログターゲット(targets)の指定は1文字以上の文字列、または配列で指定してください。';
	errMsgMap[ERR_CODE_LOG_TARGET_INVALID] = 'ログターゲット(target)の指定はプレーンオブジェクトで指定してください。';
	errMsgMap[ERR_CODE_OUT_CATEGORY_INVALID] = 'outの各要素についてcategoryは文字列で指定する必要があります。';

	// メッセージの登録
	addFwErrorCodeMap(errMsgMap);
	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	var logLevel = {

		/**
		 * ログレベル: ERROR
		 *
		 * @memberOf Log.LEVEL
		 * @const {Object} ERROR
		 * @type Number
		 */
		ERROR: 50,

		/**
		 * ログレベル: WARN
		 *
		 * @memberOf Log.LEVEL
		 * @const {Object} WARN
		 * @type Number
		 */
		WARN: 40,

		/**
		 * ログレベル: INFO
		 *
		 * @memberOf Log.LEVEL
		 * @const {Object} INFO
		 * @type Number
		 */
		INFO: 30,

		/**
		 * ログレベル: DEBUG
		 *
		 * @memberOf Log.LEVEL
		 * @const {Object} DEBUG
		 * @type Number
		 */
		DEBUG: 20,

		/**
		 * ログレベル: TRACE
		 *
		 * @memberOf Log.LEVEL
		 * @const {Object} TRACE
		 * @type Number
		 */
		TRACE: 10,

		/**
		 * ログレベル: ALL
		 *
		 * @memberOf Log.LEVEL
		 * @const {Object} ALL
		 * @type Number
		 */
		ALL: 0,

		/**
		 * ログレベル: NONE
		 *
		 * @memberOf Log.LEVEL
		 * @const {Object} NONE
		 * @type Number
		 */
		NONE: -1
	};

	// コンパイル済ログ設定
	var compiledLogSettings = null;

	// =============================
	// Functions
	// =============================
	/**
	 * 指定されたレベルを文字列に変換します。
	 */
	function levelToString(level) {
		if (level === logLevel.ERROR) {
			return 'ERROR';
		} else if (level === logLevel.WARN) {
			return 'WARN';
		} else if (level === logLevel.INFO) {
			return 'INFO';
		} else if (level === logLevel.DEBUG) {
			return 'DEBUG';
		} else if (level === logLevel.TRACE) {
			return 'TRACE';
		}
	}

	/**
	 * 指定された文字列をレベルに変換します。
	 */
	function stringToLevel(str) {
		if (str.match(/^error$/i)) {
			return logLevel.ERROR;
		} else if (str.match(/^warn$/i)) {
			return logLevel.WARN;
		} else if (str.match(/^info$/i)) {
			return logLevel.INFO;
		} else if (str.match(/^debug$/i)) {
			return logLevel.DEBUG;
		} else if (str.match(/^trace$/i)) {
			return logLevel.TRACE;
		} else if (str.match(/^all$/i)) {
			return logLevel.ALL;
		} else if (str.match(/^none$/i)) {
			return logLevel.NONE;
		} else {
			return null;
		}
	}

	/**
	 * トレース情報からトレース結果のオブジェクト取得します。
	 * <p>
	 * 以下のようなオブジェクトを返します
	 * </p>
	 *
	 * <pre><code>
	 * {
	 * 	 all: maxStackSize maxStackSizeまでのトレース結果を改行で結合した文字列
	 * 	 preview: 最大でPREVIEW_TRACE_COUNTまでのトレース結果を&quot; &lt;- &quot;で結合した文字列 &quot;[func1_2 () &lt;- func1_1 () &lt;- func1 () ...]&quot;
	 * }
	 * </code></pre>
	 *
	 * @param {String[]} traces トレース結果
	 * @param {Integer} maxStackSize 最大トレース数
	 */
	function getFormattedTraceMessage(traces, maxStackSize) {
		var result = {};
		var slicedTraces = traces.slice(0, maxStackSize);

		var previewLength = Math.min(PREVIEW_TRACE_COUNT, maxStackSize);
		var preview = slicedTraces.slice(0, previewLength).join(' <- ');

		if (slicedTraces.length > previewLength) {
			preview += ' ...';
		}

		result.preview = preview;
		result.all = slicedTraces.join('\n');
		return result;
	}

	/**
	 * 指定されたFunction型のオブジェクトから、名前を取得します。
	 *
	 * @param {Function} fn
	 */
	function getFunctionName(fn) {
		var ret = '';

		if (!fn.name) {
			var regExp = /^\s*function\s*([\w\-\$]+)?\s*\(/i;
			regExp.test(fn.toString());
			ret = RegExp.$1;
		} else {
			ret = fn.name;
		}

		return ret;
	}

	/**
	 * 指定されたFunction型のオブジェクトから、引数の型の一覧を取得します。
	 */
	function parseArgs(args) {
		var argArray = h5.u.obj.argsToArray(args);
		var result = [];

		for (var i = 0, len = argArray.length; i < len; i++) {
			result.push($.type(argArray[i]));
		}

		return result.join(', ');
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	/**
	 * コンソールにログを出力するログターゲット
	 *
	 * @name ConsoleLogTarget
	 * @constructor
	 */
	function ConsoleLogTarget() {
	// 空コンストラクタ
	}

	ConsoleLogTarget.prototype = {

		/**
		 * コンソールログターゲットの初期化を行います。
		 *
		 * @memberOf ConsoleLogTarget
		 * @function
		 * @param {Object} param 初期化パラメータ
		 */
		init: function(param) {
		// 今は特定のパラメータはない
		},

		/**
		 * ログをコンソールに出力します。
		 *
		 * @memberOf ConsoleLogTarget
		 * @function
		 * @param {Object} logObj ログ情報を保持するオブジェクト
		 */
		log: function(logObj) {
			if (!window.console) {
				return;
			}

			var args = logObj.args;
			if (!isString(args[0])) {
				this._logObj(logObj);
			} else {
				this._logMsg(logObj);
			}
		},

		/**
		 * 指定された文字列をコンソールに出力します。
		 *
		 * @memberOf ConsoleLogTarget
		 * @private
		 * @function
		 * @param {Object} logObj ログ情報を保持するオブジェクト
		 */
		_logMsg: function(logObj) {
			var args = logObj.args;
			var msg = null;

			if (args.length === 1) {
				msg = args[0];
			} else {
				msg = h5.u.str.format.apply(h5.u.str, args);
			}

			var logMsg = this._getLogPrefix(logObj) + msg;

			if (logObj.logger.enableStackTrace) {
				logMsg += '  [' + logObj.stackTrace.preview + ']';
			}

			if (logObj.logger.enableStackTrace && console.groupCollapsed) {
				console.groupCollapsed(logMsg);
			} else {
				this._consoleOut(logObj.level, logMsg);
			}

			if (logObj.logger.enableStackTrace) {
				// if (console.trace) {
				// console.trace();
				// } else {
				this._consoleOut(logObj.level, logObj.stackTrace.all);
				// }
			}

			if (logObj.logger.enableStackTrace && console.groupEnd) {
				console.groupEnd();
			}
		},

		_consoleOut: function(level, str) {
			var logPrinted = false;

			// 専用メソッドがあればそれを使用して出力
			if ((level == logLevel.ERROR) && console.error) {
				console.error(str);
				logPrinted = true;
			} else if ((level == logLevel.WARN) && console.warn) {
				console.warn(str);
				logPrinted = true;
			} else if ((level == logLevel.INFO) && console.info) {
				console.info(str);
				logPrinted = true;
			} else if ((level == logLevel.DEBUG) && console.debug) {
				console.debug(str);
				logPrinted = true;
			}

			if (!logPrinted && console.log) {
				// this.trace()の場合、または固有メソッドがない場合はlogメソッドで出力
				console.log(str);
			}
		},

		/**
		 * 出力するログのプレフィックスを作成します。
		 *
		 * @memberOf ConsoleLogTarget
		 * @private
		 * @function
		 * @param {Object} logObj ログ情報を保持するオブジェクト
		 * @return ログのプレフィックス
		 */
		_getLogPrefix: function(logObj) {
			return '[' + logObj.levelString + ']' + logObj.date.getHours() + ':'
					+ logObj.date.getMinutes() + ':' + logObj.date.getSeconds() + ','
					+ logObj.date.getMilliseconds() + ': ';
		},

		/**
		 * 指定されたオブジェクトをコンソールに出力します。
		 *
		 * @memberOf ConsoleLogTarget
		 * @private
		 * @function
		 * @param {Object} logObj ログ情報を保持するオブジェクト
		 */
		_logObj: function(logObj) {
			// 専用メソッドがあればそれを使用して出力
			var args = logObj.args;
			var prefix = this._getLogPrefix(logObj);
			args.unshift(prefix);
			if ((logObj.level == logLevel.ERROR) && console.error) {
				this._output(console.error, args);
			} else if ((logObj.level == logLevel.WARN) && console.warn) {
				this._output(console.warn, args);
			} else if ((logObj.level == logLevel.INFO) && console.info) {
				this._output(console.info, args);
			} else if ((logObj.level == logLevel.DEBUG) && console.debug) {
				this._output(console.debug, args);
			} else {
				this._output(console.log, args);
			}
		},

		_output: function(func, args) {
			try {
				// IEでは、console.log/error/info/warnにapplyがない。
				// IE11ではapplyを参照しただけでエラーが発生するので、
				// try-catchの中でfunc.applyがあるかどうか確認する
				if (func.apply) {
					// IE以外では、applyを使って呼び出さないと『TypeError:Illegal invocation』が発生する
					func.apply(console, args);
					return;
				}
			} catch (e) {
				// 何もしない
			}
			func(args);
		}
	};

	/**
	 * h5.settings.logにあるログ設定を適用します。
	 *
	 * @function
	 * @name configure
	 * @memberOf h5.log
	 */
	var configure = function() {
		// defaultOutのデフォルト
		var defaultOut = {
			level: 'NONE',
			targets: null
		};

		/* del begin */
		// h5.dev.jsではデフォルトのdefaultOutをログ出力するようにしておく。
		defaultOut = {
			level: 'debug',
			targets: 'console'
		};
		/* del end */

		// 設定オブジェクト
		var settings = $.extend(true, {}, h5.settings.log);

		// デフォルトアウトの設定
		var dOut = settings.defaultOut;
		if (!dOut) {
			dOut = defaultOut;
			settings.defaultOut = dOut;
		}

		function compileLogTarget(targets) {
			if (!$.isPlainObject(targets)) {
				throwFwError(ERR_CODE_LOG_TARGET_INVALID);
			}
			for ( var prop in targets) {
				var obj = targets[prop];
				var type = $.type(obj.type);
				// 今は"remote"でもエラーとなる
				if (type !== 'object' && obj.type !== 'console') {
					throwFwError(ERR_CODE_LOG_TARGET_TYPE);
				}
				var compiledTarget = null;
				if (obj.type === 'console') {
					compiledTarget = new ConsoleLogTarget();
				} else {
					// typeがオブジェクトの場合
					var clone = $.extend(true, {}, obj.type);
					compiledTarget = clone;
				}
				if (compiledTarget.init) {
					compiledTarget.init(obj);
				}
				obj.compiledTarget = compiledTarget;
			}
			targets.console = {
				type: 'console',
				compiledTarget: new ConsoleLogTarget()
			};
		}

		var categoryCache = [];
		function compileOutput(_logTarget, out, isDefault) {
			if (!isDefault) {
				// デフォルトアウトでない場合はcategoryの設定を行う
				var category = out.category;
				if (!isString(category) || $.trim(category).length === 0) {
					throwFwError(ERR_CODE_OUT_CATEGORY_INVALID);
				}
				category = $.trim(category);
				out.compiledCategory = getRegex(category);
				categoryCache.push(category);
			}

			// レベルのコンパイル(数値化)
			var compiledLevel;
			if (out.level == null) {
				compiledLevel = stringToLevel(isDefault ? defaultOut.level : dOut.level);
			} else {
				compiledLevel = isString(out.level) ? stringToLevel($.trim(out.level)) : out.level;
			}
			if (typeof compiledLevel !== 'number') {
				throwFwError(ERR_CODE_LEVEL_INVALID, out.level);
			}
			out.compiledLevel = compiledLevel;

			// ターゲットのコンパイル
			var compiledTargets = [];
			var targets = out.targets;
			if (targets != null) {
				var targetNames = [];
				// targetsの指定は文字列または配列またはnull,undefinedのみ
				if (!(targets == null || isArray(targets) || (isString(targets) && $.trim(targets).length))) {
					throwFwError(ERR_CODE_LOG_TARGETS_INVALID);
				}
				targets = wrapInArray(targets);
				for (var i = 0, len = targets.length; i < len; i++) {
					if (!(targets[i] == null || (isString(targets[i]) && $.trim(targets[i]).length))) {
						throwFwError(ERR_CODE_LOG_TARGETS_INVALID);
					}
					var targetName = targets[i];
					if (!targetName) {
						continue;
					}
					if ($.inArray(targetName, targetNames) !== -1) {
						throwFwError(ERR_CODE_LOG_TARGETS_NAMED_MULTIPLE_TIMES, targetName);
					}
					var l = _logTarget[targetName];
					if (!l) {
						throwFwError(ERR_CODE_LOG_TARGETS_IS_NONE, targetName);
					}
					targetNames.push(targetName);
					compiledTargets.push(l.compiledTarget);
				}
			}
			out.compiledTargets = compiledTargets;
		}

		// ログターゲットをコンパイル
		var logTarget = settings.target;
		if (!logTarget) {
			logTarget = {};
			settings.target = logTarget;
		}
		compileLogTarget(logTarget);

		// 出力定義をコンパイル
		compileOutput(logTarget, dOut, true);
		var outs = settings.out;
		if (outs) {
			outs = wrapInArray(outs);
			for (var i = 0, len = outs.length; i < len; i++) {
				compileOutput(logTarget, outs[i]);
			}
		}
		// ここまでの処理でエラーが起きなかったら設定を適用する
		compiledLogSettings = settings;
	};

	/**
	 * ログを生成するクラス
	 *
	 * @class
	 * @name Log
	 */
	function Log(category) {
		// categoryの指定が文字列以外、または空文字、空白文字ならエラー。
		if (!isString(category) || $.trim(category).length === 0) {
			throwFwError(ERR_CODE_CATEGORY_INVALID);
		}

		/**
		 * ログカテゴリ
		 *
		 * @memberOf Log
		 * @type String
		 * @name category
		 */
		this.category = $.trim(category);
	}

	Log.prototype = {
		/**
		 * ログ出力時、スタックトレース(関数呼び出し関係)を表示するか設定します。<br>
		 * (デフォルト: false[表示しない])
		 *
		 * @type Boolean
		 * @memberOf Log
		 */
		enableStackTrace: false,

		/**
		 * ログに表示するトレースの最大数を設定します。<br>
		 * (デフォルト:10)
		 *
		 * @type Number
		 * @memberOf Log
		 */
		maxStackSize: 10,

		/**
		 * LEVEL.ERROR レベルのログを出力します。
		 * <p>
		 * 引数がObject型の場合はオブジェクト構造を、String型の場合は引数の書式に合わせてログを出力します。
		 * <p>
		 * 書式については、h5.u.str.format関数のドキュメントを参照下さい。
		 *
		 * @see h5.u.str.format
		 * @memberOf Log
		 * @function
		 * @param {Any} var_args コンソールに出力する内容
		 */
		error: function(var_args) {
			this._log(logLevel.ERROR, arguments, this.error);
		},

		/**
		 * LEVEL.WARN レベルのログを出力します。
		 * <p>
		 * 引数がObject型の場合はオブジェクト構造を、String型の場合は引数の書式に合わせてログを出力します。
		 * <p>
		 * 書式については、h5.u.str.format関数のドキュメントを参照下さい。
		 *
		 * @see h5.u.str.format
		 * @memberOf Log
		 * @function
		 * @param {Any} var_args コンソールに出力する内容
		 */
		warn: function(var_args) {
			this._log(logLevel.WARN, arguments, this.warn);
		},

		/**
		 * LEVEL.INFO レベルのログを出力します。
		 * <p>
		 * 引数がObject型の場合はオブジェクト構造を、String型の場合は引数の書式に合わせてログを出力します。
		 * <p>
		 * 書式については、h5.u.str.format関数のドキュメントを参照下さい。
		 *
		 * @see h5.u.str.format
		 * @memberOf Log
		 * @function
		 * @param {Any} var_args コンソールに出力する内容
		 */
		info: function(var_args) {
			this._log(logLevel.INFO, arguments, this.info);
		},

		/**
		 * LEVEL.DEBUG レベルのログを出力します。
		 * <p>
		 * 引数がObject型の場合はオブジェクト構造を、String型の場合は引数の書式に合わせてログを出力します。
		 * <p>
		 * 書式については、h5.u.str.format関数のドキュメントを参照下さい。
		 *
		 * @see h5.u.str.format
		 * @function
		 * @memberOf Log
		 * @param {Any} var_args コンソールに出力する内容
		 */
		debug: function(var_args) {
			this._log(logLevel.DEBUG, arguments, this.debug);
		},

		/**
		 * LEVEL.TRACE レベルのログを出力します。
		 * <p>
		 * 引数がObject型の場合はオブジェクト構造を、String型の場合は引数の書式に合わせてログを出力します。
		 * <p>
		 * 書式については、h5.u.str.format関数のドキュメントを参照下さい。
		 *
		 * @see h5.u.str.format
		 * @memberOf Log
		 * @function
		 * @param {Any} var_args コンソールに出力する内容
		 */
		trace: function(var_args) {
			this._log(logLevel.TRACE, arguments, this.trace);
		},

		/**
		 * スタックトレース(関数呼び出し関係)を取得します。
		 *
		 * @private
		 * @memberOf Log
		 * @function
		 * @param fn {Function} トレース対象の関数
		 * @returns {Object} 以下のようなオブジェクトを返します
		 *
		 * <pre><code>
		 * {
		 * 	 all: maxStackSize maxStackSizeまでのトレース結果を改行で結合した文字列
		 * 	 preview: 最大でPREVIEW_TRACE_COUNTまでのトレース結果を&quot; &lt;- &quot;で結合した文字列 &quot;[func1_2 () &lt;- func1_1 () &lt;- func1 () ...]&quot;
		 * }
		 * </code></pre>
		 */
		_traceFunctionName: function(fn) {
			var traces = [];
			// エラーオブジェクトを生成してスタックトレースを取得
			var e = new Error();
			var errMsg = e.stack || e.stacktrace;
			if (errMsg) {
				// stackまたはstacktraceがある場合(IE,Safari以外)

				// stackにはFW内部の関数も含まれるので、それを取り除く
				// new Error()を呼んだ場合に関数呼び出し３つ分省略すればいいが、minifyするとnew演算子が省略される
				// Chrome,FireFoxではnew演算子を省略するコンストラクト呼び出しがstackに入り、newを使った場合と結果が異なる
				// Operaではnew演算子を省略しても結果は変わらない
				// min版、dev版の互換とブラウザ互換をとるために、取り除く関数呼び出しはここの関数名を基点に数えて取り除く
				var CURRENT_FUNCTION_REGEXP = /_traceFunctionName/;
				// トレースされたログのうち、ここの関数から3メソッド分先までの関数呼び出しはログに出力しない。
				// (_traceFunction, _log, debug|info|warn|error|trace の3つ。この関数+2の箇所でsliceする)
				var DROP_TRACE_COUNT = 3;
				traces = errMsg.replace(/\r\n/, '\n').replace(
						/at\b|@|Error\b|\t|\[arguments not available\]/ig, '').replace(
						/(http|https|file):.+[0-9]/g, '').replace(/ +/g, ' ').split('\n');

				var ret = null;
				var currentFunctionIndex = null;
				traces = $.map(traces, function(value, index) {
					if (value.length === 0) {
						// 不要なデータはnullを返して削除(Chromeは配列の先頭, FireFoxは配列の末尾に存在する)
						// ただしslice箇所が決定する前は削除しない(nullを返さないようにする)
						return currentFunctionIndex == null ? '' : null;
					} else if ($.trim(value) === '') {
						ret = '{anonymous}'; // ログとして出力されたが関数名が無い
					} else {
						ret = $.trim(value);
					}
					if (currentFunctionIndex === null && CURRENT_FUNCTION_REGEXP.test(value)) {
						currentFunctionIndex = index;
					}
					return ret;
				}).slice(currentFunctionIndex + DROP_TRACE_COUNT);
			} else {
				// IE, Safari

				// 呼び出された関数を辿って行ったときに"use strict"宣言を含む関数がある場合、
				// IE11だとcallerプロパティへアクセスすると以下のようにエラーが発生する
				// 『strict モードでは、関数または arguments オブジェクトの 'caller' プロパティを使用できません』
				// (例えばjQuery1.9.0は"use strict"宣言がされており、jQuery1.9.0内の関数を経由して呼ばれた関数は全てstrictモード扱いとなり、
				// callerプロパティにアクセスできない)
				// そのため、try-catchで囲んで、取得できなかった場合は{unable to trace}を出力する

				// fnは、(debug|info|warn|error|trace)の何れかなので、その呼び出し元から辿る
				var caller = fn.caller;
				for (var i = 0, l = this.maxStackSize; i < l; i++) {
					var funcName = getFunctionName(caller);
					var argStr = parseArgs(caller.arguments);
					var nextCaller;
					try {
						nextCaller = caller.caller;
					} catch (e) {
						// エラーが発生してトレースできなくなったら終了
						traces.push('{unable to trace}');
						break;
					}
					if (funcName) {
						// 関数名が取得できているときは関数名を表示
						traces.push('{' + funcName + '}(' + argStr + ')');
					} else if (nextCaller) {
						// 関数名は取得できていなくても次の関数ができているなら{anonymous}として表示
						traces.push('{anonymous}(' + argStr + ')');
					} else {
						// 次の関数が無い場合はルートからの呼び出し
						traces.push('{root}(' + argStr + ')');
					}
					if (!nextCaller) {
						// これ以上トレースできないので終了
						break;
					}
					caller = nextCaller;
				}
			}
			return getFormattedTraceMessage(traces, this.maxStackSize);
		},

		/**
		 * ログ情報を保持するオブジェクトに以下の情報を付与し、コンソールまたはリモートサーバにログを出力します。
		 * <ul>
		 * <li>時刻
		 * <li>ログの種別を表す文字列(ERROR, WARN, INFO, DEBUG, TRACE, OTHER)
		 * </ul>
		 *
		 * @private
		 * @memberOf Log
		 * @function
		 * @param {Number} level ログレベル
		 * @param {Arguments} args 引数
		 * @param {Function} func 元々呼ばれた関数
		 */
		_log: function(level, args, func) {
			var logObj = {
				level: level,
				args: h5.u.obj.argsToArray(args),
				stackTrace: this.enableStackTrace ? this._traceFunctionName(func) : ''
			};

			var outs = compiledLogSettings.out;
			var defaultOut = compiledLogSettings.defaultOut;

			var targetOuts = [];
			var terminated = false;
			if (outs) {
				outs = wrapInArray(outs);
				for (var i = 0, len = outs.length; i < len; i++) {
					var out = outs[i];
					if (out.compiledCategory.test(this.category)
							&& (level >= out.compiledLevel && out.compiledLevel >= 0)) {
						// カテゴリとレベル指定を満たした出力定義が出力対象
						targetOuts.push(out);
						if (out.terminate !== false) {
							// terminate:falseが明示的に指定されていない場合、出力定義にマッチするかどうかの探索を打ち切る
							terminated = true;
							break;
						}
					}
				}
			}
			if (!targetOuts.length || !terminated) {
				// いずれの出力定義の条件も満たさなかったまたは、何れかの条件を満たしたが、terminateしていない場合は、defaultOutも出力対象
				targetOuts.push(defaultOut);
			}
			for (var i = 0, l = targetOuts.length; i < l; i++) {
				var targetOut = targetOuts[i];
				var levelThreshold = targetOut.compiledLevel;
				var logTarget = targetOut.compiledTargets;

				if (level < levelThreshold || levelThreshold < 0) {
					return;
				}

				logObj.logger = this;
				logObj.date = new Date();
				logObj.levelString = this._levelToString(level);

				if (!logTarget || logTarget.length === 0) {
					return;
				}

				for (var j = 0, len = logTarget.length; j < len; j++) {
					logTarget[j].log(logObj);
				}
			}
		},

		/**
		 * ログレベルを判定して、ログの種別を表す文字列を取得します。
		 *
		 * @private
		 * @memberOf Log
		 * @function
		 * @param {Object} level
		 */
		_levelToString: levelToString
	};

	/**
	 * ロガーを作成します。
	 *
	 * @param {String} [category=null] カテゴリ.
	 * @returns {Log} ロガー.
	 * @name createLogger
	 * @function
	 * @memberOf h5.log
	 * @see Log
	 */
	var createLogger = function(category) {
		return new Log(category);
	};

	// =============================
	// Expose to window
	// =============================

	/**
	 * @namespace
	 * @name log
	 * @memberOf h5
	 */
	h5.u.obj.expose('h5.log', {
		createLogger: createLogger,
		configure: configure
	});
})();
/* ------ (h5) ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	// =============================
	// Development Only
	// =============================

	/* del begin */

	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	// =============================
	// Functions
	// =============================
	/**
	 * すべてのアスペクト設定をコンパイルします。
	 *
	 * @param {Object|Object[]} aspects アスペクト設定
	 */
	function compileAspects(aspects) {
		var compile = function(aspect) {
			if (aspect.target) {
				aspect.compiledTarget = getRegex(aspect.target);
			}
			if (aspect.pointCut) {
				aspect.compiledPointCut = getRegex(aspect.pointCut);
			}
			return aspect;
		};
		h5.settings.aspects = $.map(wrapInArray(aspects), function(n) {
			return compile(n);
		});
	}


	/**
	 * h5.ajax()でリトライする時のデフォルトのフィルタ<br>
	 * <p>
	 * falseを返した場合はリトライしない。リトライする場合はリトライするajaxSettingsオブジェクト($.ajax()に渡すオブジェクト)を返す。
	 * type===GETかつステータスコードが0(タイムアウト)または12029(IEでコネクションが繋がらない)場合にリトライする。
	 * </p>
	 * <p>
	 * 引数は$.ajaxのfailコールバックに渡されるものが入る。 thisはajaxを呼んだ時の設定パラメータを含むajaxSettingsオブジェクト
	 * </p>
	 *
	 * @param {jqXHR} jqXHR jqXHRオブジェクト
	 * @param {String} textStatus
	 * @param {String} thrownError
	 * @returns {false|Object} リトライしない場合はfalseを返す。する場合はthis(ajaxSettingsオブジェクト)を返す
	 */
	function defaultAjaxRetryFilter(jqXHR, textStatus, thrownError) {
		// type===GETかつステータスコードが0(タイムアウト)または12029(IEでコネクションが繋がらない)場合にリトライする
		var stat = jqXHR.status;
		// jQuery1.9以降、GET,POSTの設定はtypeではなくmethodで指定することが推奨されているが、
		// thisにはtypeにtoUpperCase()されたものが格納されている
		var type = this.type;
		if (type === 'POST' || !(stat === 0 || stat === ERROR_INTERNET_CANNOT_CONNECT)) {
			return false;
		}
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	/**
	 * 設定を格納するh5.settingsオブジェクト
	 *
	 * @name settings
	 * @memberOf h5
	 * @namespace
	 */
	h5.u.obj.ns('h5.settings');

	h5.settings = {

		/**
		 * failコールバックの設定されていないDeferred/Promiseオブジェクトの共通のエラー処理
		 * <p>
		 * failコールバックが一つも設定されていないDeferredオブジェクトがrejectされたときにcommonFailHandlerに設定した関数が実行されます。
		 * <p>
		 * <p>
		 * commonFailHandlerが実行されるDeferredオブジェクトは、h5.async.deferred()で作成したDeferredオブジェクトかhifive内部で生成されているDeferredオブジェクトだけです。
		 * jQuery.Deferred()で生成したDeferredオブジェクトは対象ではありません。
		 * </p>
		 * <p>
		 * commonFailHandlerの引数と関数内のthisは通常のfailハンドラと同様で、それぞれ、rejectで渡された引数、rejectの呼ばれたDefferedオブジェクト、です。
		 * </p>
		 * <h4>サンプル</h4>
		 *
		 * <pre>
		 * // commonFailHandlerの登録
		 * h5.settings.commonFailHandler = function(e) {
		 * 	alert(e);
		 * };
		 *
		 * // Deferredオブジェクトの生成
		 * var dfd1 = h5.async.deferred();
		 * var dfd2 = h5.async.deferred();
		 * var dfd3 = h5.async.deferred();
		 *
		 * dfd1.reject(1);
		 * // alert(1); が実行される
		 *
		 * dfd2.fail(function() {});
		 * dfd2.reject(2);
		 * // failコールバックが登録されているので、commonFailHandlerは実行されない
		 *
		 * var promise3 = dfd3.promise();
		 * promise3.fail(function() {});
		 * dfd3.reject(3);
		 * // promiseオブジェクトからfailコールバックを登録した場合も、commonFailHandlerは実行されない
		 *
		 * h5.ajax('hoge');
		 * // 'hoge'へのアクセスがエラーになる場合、commonFailHandlerが実行される。
		 * // エラーオブジェクトが引数に渡され、[object Object]がalertで表示される。
		 * // h5.ajax()の戻り値であるDeferredオブジェクトが内部で生成されており、
		 * // そのDeferredオブジェクトにfailハンドラが登録されていないためである。
		 *
		 * var d = h5.ajax('hoge');
		 * d.fail(function() {});
		 * // failハンドラが登録されているため、commonFailHandlerは実行されない
		 * </pre>
		 *
		 * <h4>デフォルトの設定</h4>
		 * <p>
		 * h5.settings.commonFailHandlerのデフォルト値はnullです。共通のエラー処理はデフォルトでは何も実行されません。
		 * commonFailHandlerでの処理を止めたい場合は、nullを代入して設定をクリアしてください。
		 * </p>
		 *
		 * <pre>
		 * h5.settings.commonFailHandler = null;
		 * </pre>
		 *
		 * @memberOf h5.settings
		 * @type Function
		 */
		commonFailHandler: null,

		/**
		 * コントローラ、ロジックへのアスペクトを設定します。
		 *
		 * @memberOf h5.settings
		 * @type Aspect|Aspect[]
		 */
		aspects: null,

		/**
		 * ログの設定を行います。
		 *
		 * @memberOf h5.settings
		 * @type Object
		 */
		log: null,

		/**
		 * コントローラのイベントリスナーのターゲット要素（第2引数）をどの形式で渡すかを設定します。<br>
		 * <ul>
		 * <li>1 (default) : jQueryオブジェクト
		 * <li>0 : ネイティブ形式（DOM要素そのもの）
		 * </ul>
		 *
		 * @since 1.1.4
		 * @memberOf h5.settings
		 * @type Number
		 */
		listenerElementType: 1,

		/**
		 * コントローラに記述されたテンプレートの読み込み等、動的リソース読み込み時の設定を行います。<br>
		 * このプロパティはオブジェクトで、<code>h5.settings.dynamicLoading.retryCount = 3;</code>のようにして設定します。<br>
		 * dynamicLoadingで指定できるプロパティ：
		 * <dl>
		 * <dt>retryCount</dt>
		 * <dd>一時的な通信エラーが発生した場合に通信をリトライする回数（デフォルト：3）</dd>
		 * <dt>retryInterval</dt>
		 * <dd>一時的な通信エラーが発生した場合に通信をリトライするまでの待ち秒数（ミリ秒）。通信エラーが発生した場合、ここで指定した秒数待ってからリクエストを送信します。（デフォルト：500）</dd>
		 * </dl>
		 *
		 * @since 1.1.4
		 * @memberOf h5.settings
		 * @type Object
		 */
		dynamicLoading: {
			retryCount: 3,
			retryInterval: 500
		},

		/**
		 * h5.ajaxの設定<br>
		 * <p>
		 * このパラメータはオブジェクトで、以下のプロパティを持ちます
		 * </p>
		 * <dl>
		 * <dt>retryCount</dt>
		 * <dd>一時的な通信エラーが発生した場合に通信をリトライする回数。デフォルトは0で、リトライを行いません。</dd>
		 * <dt>retryInterval</dt>
		 * <dd>一時的な通信エラーが発生した場合に通信をリトライするまでの待ち秒数（ミリ秒）。
		 * <p>
		 * 通信エラーが発生した場合、ここで指定した秒数待ってからリクエストを送信します。デフォルトは500msです。
		 * 同期(async:false)でh5.ajaxを呼んだ場合はretryIntervalは無視され、即座にリトライします。 (同期で呼んだ場合は必ず結果が同期で返ってきます。)
		 * </p>
		 * </dd>
		 * <dt>retryFilter</dt>
		 * <dd> リトライ時に実行する関数を登録できます。
		 * <p>
		 * リトライが有効な場合、呼び出しが失敗した場合に呼ばれます。 (失敗か成功かは、jQuery.ajaxの結果に基づく。200番台、304番なら成功、それ以外は失敗。)
		 * </p>
		 * <p>
		 * retryFilterに設定した関数がfalseを返した場合はリトライを中止し、それ以外を返した場合はリトライを継続します。
		 * (retryCountに設定した回数だけリトライをしたら、retryFilterの戻り値に関わらずリトライを中止します。)
		 * </p>
		 * <p>
		 * デフォルトで設定してあるretryFilterは、「メソッドがGET、かつ、コネクションタイムアウトで失敗した場合のみリトライする」 ようになっています。
		 * </p>
		 * <p>
		 * この挙動を変えたい場合は、以下のようにしてretryFilter関数を差し替えます。
		 * </p>
		 * <code><pre>
		 * h5.settings.ajax.retryFilter = function(jqXHR, textStatus, thrownError) {
		 * 	// この関数のthisはh5.ajax()呼び出し時のパラメータオブジェクトです。
		 * 	// thisを見ると、メソッドがGETかPOSTか、等も分かります。
		 * 	console.log('Ajax呼び出し失敗。textStatus = ' + textStatus);
		 * 	return false; // 明示的にfalseを返した場合のみリトライを中止する
		 * }
		 * </pre></code> </dd>
		 * </dl>
		 * h5preinitのタイミングで設定すると、ユーザコード内のh5.ajaxの呼び出し全てに反映されます。 <code><pre>
		 * $(document).bind('h5preinit', function() {
		 * 	h5.settings.ajax = {
		 * 		retryCount: 3,
		 * 		retryInterval: 500,
		 * 		retryFilter: function(){...}
		 * 	};
		 * });
		 * </pre></code>
		 * <p>
		 * また、h5.ajax()の呼び出しパラメータで指定すると、呼び出しごとに設定を変えることもできます。 指定しなかったパラメータは<code>h5.settings.ajax</code>のパラメータが使われます。
		 * </p>
		 * <code><pre>
		 * h5.ajax({
		 * 	url: 'hoge',
		 * 	retryCount: 1
		 * });
		 * // この場合、retryCountだけ1になり、retryIntervalとretryFilterはsettingsのものが使われます。
		 * </pre></code>
		 *
		 * @since 1.1.5
		 * @memberOf h5.settings
		 * @type Object
		 */
		ajax: {
			retryCount: 0,
			retryInterval: 500,
			retryFilter: defaultAjaxRetryFilter
		},

		/**
		 * コントローラがh5trackstartイベントにバインドするときに、バインド対象のターゲットに設定するCSSプロパティ"touch-action"の値
		 * <p>
		 * デフォルトは"none"で、h5trackstartイベントがバインドされた要素はタッチ操作でスクロールされないようになります。
		 * </p>
		 * <p>
		 * nullを設定した場合はtouch-actionへの値の設定は行いません。
		 * </p>
		 *
		 * @since 1.1.10
		 * @memberOf h5.settings
		 * @type String
		 */
		trackstartTouchAction: 'none',

		res: {
			/**
			 * リソースを取得時のカレントパス
			 * <p>
			 * デフォルトはnullで、hifiveを読み込んだページがカレントパスになります(空文字を指定した場合もnullと同じです)
			 * </p>
			 *
			 * @memberOf h5.settings.res
			 */
			baseUrl: null,

			/**
			 * タイムアウト時間設定(ms)
			 * <p>
			 * タイムアウトに設定された時間待機して、依存解決ができない場合、resolve()は失敗します。デフォルトは10000(10秒)です。
			 * </p>
			 *
			 * @memberOf h5.settings.res
			 */
			timeoutTime: 10000
		}
	};

	// h5preinitでglobalAspectsの設定をしている関係上、別ファイルではなく、ここに置いている。

	/**
	 * メソッド呼び出し時に、コントローラまたはロジック名、メソッド名、引数をログ出力するインターセプタです。<br>
	 * このインターセプタはコントローラまたはロジックに対して設定してください。<br>
	 * ver.1.1.6以降、このインターセプタは処理時間も出力します。<br>
	 * 「処理時間」とは、メソッドの戻り値がPromiseでない場合は呼び出し～returnされるまでの時間、<br>
	 * 戻り値がPromiseだった場合は呼び出し～そのPromiseがresolveまたはrejectされるまでの時間です。
	 *
	 * @function
	 * @param {Function} invocation 次に実行する関数
	 * @returns {Any} invocationの戻り値
	 * @memberOf h5.core.interceptor
	 */
	var logInterceptor = h5.u.createInterceptor(function(invocation, data) {
		this.log.info('{0}.{1}が開始されました。', this.__name, invocation.funcName);
		this.log.info(invocation.args);

		data.start = new Date();

		return invocation.proceed();
	}, function(invocation, data) {
		var end = new Date();
		var time = end.getTime() - data.start.getTime();

		this.log.info('{0}.{1}が終了しました。 Time={2}ms', this.__name, invocation.funcName, time);
	});

	/**
	 * メソッドの実行時間を計測するインターセプタです。<br>
	 * このインターセプタはコントローラまたはロジックに対して設定してください。
	 *
	 * @deprecated ※このメソッドの代わりに、logInterceptorを使用してください。ver.1.1.6以降、lapInterceptorはlogInterceptorと同じになりました。
	 * @function
	 * @param {Function} invocation 次に実行する関数
	 * @returns {Any} invocationの戻り値
	 * @memberOf h5.core.interceptor
	 */
	var lapInterceptor = logInterceptor;

	/**
	 * 例外発生時にcommonFailHandlerを呼び出すインターセプタです。<br>
	 * このインターセプタをかけたメソッド内で例外がスローされメソッド内でキャッチされなかった場合、
	 * その例外オブジェクトを引数にしてcommonFailHandlerを呼びだします（commonFailHandlerがない場合はなにもしません）。
	 *
	 * @param {Function} invocation 次に実行する関数
	 * @returns {Any} invocationの戻り値
	 * @memberOf h5.core.interceptor
	 */
	var errorInterceptor = function(invocation) {
		var ret = null;
		try {
			ret = invocation.proceed();
		} catch (e) {
			if (h5.settings.commonFailHandler && isFunction(h5.settings.commonFailHandler)) {
				h5.settings.commonFailHandler.call(null, e);
			}
		}
		return ret;
	};

	// ここで公開しないとh5preinit時にデフォルトインターセプタが定義されていないことになる
	/**
	 * @name interceptor
	 * @memberOf h5.core
	 * @namespace
	 */
	h5.u.obj.expose('h5.core.interceptor', {
		lapInterceptor: lapInterceptor,
		logInterceptor: logInterceptor,
		errorInterceptor: errorInterceptor
	});

	// h5preinitイベントをトリガ.
	$(document).trigger('h5preinit');

	if (h5.settings.aspects) {
		compileAspects(h5.settings.aspects);
	}

	// ログ設定の適用
	h5.log.configure();

	// =============================
	// Expose to window
	// =============================
	/* del begin */
	// テストのために公開している。
	h5.u.obj.expose('h5.core', {
		__compileAspects: compileAspects
	});
	/* del end */
})();
/* ------ h5.env ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	// =============================
	// Development Only
	// =============================

	/* del begin */

	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	// =============================
	// Functions
	// =============================
	function check(ua) {
		/**
		 * iPhoneであるかどうかを表します。 Chrome For iOS など、標準ブラウザでなくてもiPhoneであれば、trueです。
		 *
		 * @name isiPhone
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isiPhone = !!ua.match(/iPhone/i);

		/**
		 * iPadであるかどうかを表します。 Chrome For iOS など、標準ブラウザでなくてもiPhoneであれば、trueです。
		 *
		 * @name isiPad
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isiPad = !!ua.match(/iPad/i);

		/**
		 * iOSであるかどうかを表します。 isiPhoneまたはisiPadがtrueであればtrueです。
		 *
		 * @name isiOS
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isiOS = isiPhone || isiPad;

		/**
		 * Androidであるかどうかを表します。 Androidであれば標準ブラウザでなくても、trueです。
		 *
		 * @name isAndroid
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isAndroid = !!ua.match(/android/i);

		/**
		 * Windows Phoneであるかどうかを表します。
		 *
		 * @name isWindowsPhone
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isWindowsPhone = !!ua.match(/Windows Phone/i);

		/**
		 * ブラウザがInternet Explorerであるかどうかを表します。
		 *
		 * @name isIE
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isIE = !!ua.match(/MSIE/) || !!ua.match(/Trident/);

		/**
		 * ブラウザがFirefoxであるかどうかを表します。 モバイル端末のFirefoxでもtrueです。
		 *
		 * @name isFirefox
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isFirefox = !!ua.match(/Firefox/i);

		/**
		 * ブラウザがGoogle Chromeであるかどうかを表します。 Chromeモバイル、Chrome iOS の場合もtrueです。<br />
		 * 以下の文字列が含まれる場合にtrueになります。<br />
		 * <ul>
		 * <li>Chrome (Chrome for Android / Desktop)</li>
		 * <li>CrMo (Chrome for Android)</li>
		 * <li>CriOS (Chrome for iOS)</li>
		 * </ul>
		 *
		 * @name isChrome
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isChrome = !!ua.match(/Chrome/i) || !!ua.match(/CrMo/) || !!ua.match(/CriOS/);

		/**
		 * ブラウザがSafariであるかどうかを表します。 iOSのSafariの場合もtrueです。
		 *
		 * @name isSafari
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isSafari = !isAndroid && !!ua.match(/Safari/i) && !isChrome;

		/**
		 * レンダリングエンジンがWebkitであるかどうかを表します。
		 *
		 * @name isWebkit
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isWebkit = !!ua.match(/Webkit/i);

		/**
		 * ブラウザがOperaであるかどうかを表します。 モバイル、iOSのOperaの場合もtrueです。
		 *
		 * @name isOpera
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isOpera = !!ua.match(/Opera/i);
		/**
		 * ブラウザがAndroid標準ブラウザであるかどうかを表します。
		 *
		 * @name isAndroidDefaultBrowser
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isAndroidDefaultBrowser = isAndroid && !!ua.match(/Safari/i) && !isChrome;

		/**
		 * スマートフォンであるかどうかを表します。<br />
		 * isiPhone, isWindowsPhoneがtrueならtrueとなります。<br />
		 * Androidの場合、判定は以下の場合にtrueとなります。
		 * <ul>
		 * <li>Android標準ブラウザ、かつユーザーエージェントに"Mobile"を含む、かつ"SC-01C"を含まない。 </li>
		 * <li>ユーザーエージェントに"Fennec"を含む。</li>
		 * <li>ユーザーエージェントに"Opera Mobi"を含む。</li>
		 * </ul>
		 *
		 * @name isSmartPhone
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isSmartPhone = !!(isiPhone || isWindowsPhone
				|| (isAndroidDefaultBrowser && ua.match(/Mobile/) && !ua.match(/SC-01C/))
				|| (isAndroid && isChrome && ua.match(/Mobile/)) || ua.match(/Fennec/i) || ua
				.match(/Opera Mobi/i));

		/**
		 * タブレットであるかどうかを表します。<br />
		 * isiPadがtrueならtrueとなります。<br />
		 * Androidの場合、判定は以下の場合にtrueとなります。
		 * <ul>
		 * <li>Android標準ブラウザ、かつユーザーエージェントに"Mobile"を含まない。ただし"SC-01C"を含む場合はtrue。 </li>
		 * <li>ユーザーエージェントに"Fennec"を含む。</li>
		 * <li>ユーザーエージェントに"Opera Tablet"を含む。</li>
		 * </ul>
		 *
		 * @name isTablet
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isTablet = !!(isiPad || (isAndroidDefaultBrowser && !ua.match(/Mobile/))
				|| (isAndroid && isChrome && !ua.match(/Mobile/)) || ua.match(/SC-01C/)
				|| ua.match(/Fennec/i) || ua.match(/Opera Tablet/i));

		/**
		 * PCであるかどうかを表します。 isSmartPhoneとisTabletがいずれもfalseの場合にtrueです。
		 *
		 * @name isDesktop
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isDesktop = !isSmartPhone && !isTablet;

		/**
		 * OSのバージョンを表します。<br />
		 * h5.env.ua.isDesktopがtrueである場合、値はnullになります。
		 *
		 * @name osVersion
		 * @type Number
		 * @memberOf h5.env.ua
		 */
		var osVersion = null;

		/**
		 * OSのフルバージョンを表します。<br />
		 * h5.env.ua.isDesktopがtrueである場合、値はnullになります。
		 *
		 * @name osVersionFull
		 * @type String
		 * @memberOf h5.env.ua
		 */
		var osVersionFull = null;

		var getiOSVersion = function(pre, post) {
			return $.trim(ua.substring(ua.indexOf(pre) + pre.length, ua.indexOf(post))).split('_');
		};

		var getVersion = function(target, end, ignoreCase) {
			var r = ignoreCase === false ? new RegExp(target + end) : new RegExp(target + end, 'i');
			return $.trim(ua.match(r));
		};

		function spaceSplit(target, ignoreCase) {
			var v = getVersion(target, '[^;)]*', ignoreCase).split(' ');
			if (v.length === 1)
				return '';
			return v[v.length - 1];
		}

		function slashSplit(target, ignoreCase) {
			var v = getVersion(target, '[^;) ]*', ignoreCase).split('/');
			if (v.length === 1)
				return '';
			return v[v.length - 1];
		}

		function colonSplit(target, ignoreCase) {
			var v = getVersion(target, '[^;) ]*', ignoreCase).split(':');
			if (v.length === 1)
				return '';
			return v[v.length - 1];
		}

		var getMainVersion = function(target) {
			return parseInt(target.split('.')[0]);
		};

		if (isiPhone) {
			var s = getiOSVersion('iPhone OS', 'like');
			osVersion = parseInt(s[0]);
			osVersionFull = s.join('.');
		} else if (isiPad) {
			var s = getiOSVersion('CPU OS', 'like');
			osVersion = parseInt(s[0]);
			osVersionFull = s.join('.');
		} else if (isAndroid && isFirefox) {
			// FennecはAndroidのバージョンを取得することができない。
		} else if (isAndroid) {
			var s = spaceSplit('Android');
			osVersion = getMainVersion(s);
			osVersionFull = s;
		} else if (isWindowsPhone) {
			var s = spaceSplit('Windows Phone OS');
			if (!s) {
				s = spaceSplit('Windows Phone');
			}
			osVersion = getMainVersion(s);
			osVersionFull = s;
		}

		// Operaのuaに'MSIE'が入っているとき用に、isIE && isOperaならisIEをfalseにする
		if (isIE && isOpera) {
			isIE = false;
		}

		// デスクトップの場合。osVersion, osVersionFullはnull
		/**
		 * ブラウザのバージョンを表します。
		 *
		 * @name browserVersion
		 * @type Number
		 * @memberOf h5.env.ua
		 */
		var browserVersion = null;

		/**
		 * ブラウザのフルバージョンを表します。
		 *
		 * @name browserVersionFull
		 * @type String
		 * @memberOf h5.env.ua
		 */
		var browserVersionFull = null;

		if (isiOS || (isAndroid && isAndroidDefaultBrowser)) {
			browserVersion = osVersion;
			browserVersionFull = osVersionFull;
		} else {
			var version = null;
			if (isIE) {
				version = spaceSplit('MSIE', false) || colonSplit('rv');
			} else if (isChrome) {
				version = slashSplit('Chrome', false);
				if (!version) {
					version = slashSplit('CrMo', false);
				}
			} else if (isSafari) {
				version = slashSplit('Version');
			} else if (isFirefox) {
				version = slashSplit('Firefox');
			} else if (isOpera) {
				version = slashSplit('Version');
				if (!version) {
					version = slashSplit('Opera');
				}
				if (!version) {
					version = spaceSplit('Opera');
				}
			}
			if (version) {
				browserVersion = getMainVersion(version);
				browserVersionFull = version;
			}
		}

		return {
			osVersion: osVersion,
			osVersionFull: osVersionFull,
			browserVersion: browserVersion,
			browserVersionFull: browserVersionFull,
			isiPhone: isiPhone,
			isiPad: isiPad,
			isiOS: isiOS,
			isAndroid: isAndroid,
			isWindowsPhone: isWindowsPhone,
			isIE: isIE,
			isFirefox: isFirefox,
			isChrome: isChrome,
			isSafari: isSafari,
			isOpera: isOpera,
			isAndroidDefaultBrowser: isAndroidDefaultBrowser,
			isSmartPhone: isSmartPhone,
			isTablet: isTablet,
			isDesktop: isDesktop,
			isWebkit: isWebkit
		};
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	// =============================
	// Expose to window
	// =============================
	/**
	 * @namespace
	 * @name env
	 * @memberOf h5
	 */
	/**
	 * ユーザーエージェントからOS、ブラウザを判別します。<br />
	 * 例えば、iPhoneのSafariかどうかを判別したい場合は、<br />
	 * <br />
	 * h5.env.ua.isiPhone && h5.env.ua.isSafari<br />
	 * <br />
	 * で判別することができます。<br />
	 * <br />
	 * 機能の有無を判別したい場合は、基本的にはこれらのプロパティを使わず、機能の有無でチェックしてください。<br />
	 * 例えば『Geolocationが使えるか』を判別したい場合、h5.api.geo.isSupportedで判別できます。<br />
	 *
	 * @namespace
	 * @name ua
	 * @memberOf h5.env
	 */
	h5.u.obj.expose('h5.env', {
		ua: check(navigator.userAgent)
	});

	/* del begin */
	// テストのためにグローバルに公開。プリプロセッサで削除される。
	h5.u.obj.expose('h5.env', {
		__check: check
	});
	/* del end */
})();
/* ------ h5.async ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/**
	 * h5.async.loopの第一引数に配列以外のものが渡されたときに発生するエラー
	 */
	var ERR_CODE_NOT_ARRAY = 5000;

	/**
	 * h5.async.deferredがcommonFailHandlerの管理のために上書くjQuery.Deferredのメソッド (failコールバックを登録する可能性のある関数)
	 *
	 * @private
	 * @type {Array}
	 */
	var CFH_HOOK_METHODS = ['fail', 'always', 'pipe', 'then'];

	/**
	 * pipeを実装するために使用するコールバック登録メソッド
	 *
	 * @private
	 * @type {Array}
	 */
	var PIPE_CREATE_METHODS = ['done', 'fail', 'progress'];

	/**
	 * pipeを実装するために使用するコールバック登録メソッドに対応するDeferredのコールバック呼び出しメソッド
	 *
	 * @private
	 * @type {Array}
	 */
	var PIPE_CREATE_ACTIONS = ['resolve', 'reject', 'notify'];

	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.async');

	/* del begin */
	var FW_LOG_H5_WHEN_INVALID_PARAMETER = 'h5.async.when: 引数にpromiseオブジェクトでないものが含まれています。';

	/**
	 * 各エラーコードに対応するメッセージ
	 */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_NOT_ARRAY] = 'h5.async.each() の第1引数は配列のみを扱います。';

	// メッセージの登録
	addFwErrorCodeMap(errMsgMap);
	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	/**
	 * argsToArrayのショートカット
	 *
	 * @private
	 */
	var argsToArray = h5.u.obj.argsToArray;
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================

	// thenが新しいプロミス(deferred)を返す(jQuery1.8以降)かどうか
	// jQuery.thenの挙動の確認

	var isThenReturnsNewPromise = (function() {
		var tempDfd = $.Deferred();
		return tempDfd !== tempDfd.then();
	})();

	// =============================
	// Functions
	// =============================
	/**
	 * progres,notify,notifyWithが無ければそれらを追加する
	 *
	 * @private
	 * @param {Deferred} dfd
	 */
	function addProgressFeatureForCompatibility(dfd) {
		// 既にnorify/notifyWithが呼ばれたかどうかのフラグ
		var notified = false;
		// 最後に指定された実行コンテキスト
		var lastNotifyContext = null;
		// 最後に指定されたパラメータ
		var lastNotifyParam = null;
		// progressCallbacksを格納するための配列
		var progressCallbacks = [];

		// progress,notify,notifyWithを追加
		dfd.progress = function(/* var_args */) {
			// progressの引数は、配列でも可変長でも、配列を含む可変長でも渡すことができる
			// 再帰で処理する
			var callbacks = argsToArray(arguments);
			for (var i = 0, l = callbacks.length; i < l; i++) {
				var elem = callbacks[i];
				if (isArray(elem)) {
					dfd.progress.apply(this, elem);
				} else if (isFunction(elem)) {
					if (notified) {
						// 既にnorify/notifyWithが呼ばれていた場合、jQuery1.7以降の仕様と同じにするためにコールバックの登録と同時に実行する必要がある
						var params = lastNotifyParam;
						if (params !== lastNotifyParam) {
							params = wrapInArray(params);
						}
						elem.apply(lastNotifyContext, params);
					} else {
						progressCallbacks.push(elem);
					}
				}
			}
			return this;
		};

		function notify(/* var_args */) {
			notified = true;
			lastNotifyContext = this;
			lastNotifyParam = argsToArray(arguments);
			if (isRejected(dfd) || isResolved(dfd)) {
				// resolve済みまたはreject済みならprogressコールバックは実行しない
				return dfd;
			}
			var args = argsToArray(arguments);
			// progressコールバックが登録されていたら全て実行する
			if (progressCallbacks.length > 0) {
				for (var i = 0, callbackLen = progressCallbacks.length; i < callbackLen; i++) {
					var params = args;
					if (params !== arguments) {
						params = wrapInArray(params);
					}
					// 関数を実行。関数以外は無視。
					isFunction(progressCallbacks[i]) && progressCallbacks[i].apply(this, params);
				}
			}
			return dfd;
		}
		dfd.notify = notify;

		/**
		 * jQueryの公式Doc(2013/6/4時点)だとnotifyWithの第2引数はObjectと書かれているが、
		 * 実際は配列で渡す(jQuery1.7+のnotifyWithと同じ。resolveWith, rejectWithも同じ)。
		 * notifyは可変長で受け取る(公式Docにはオブジェクトと書かれているが、resolve、rejectと同じ可変長)。
		 */
		dfd.notifyWith = function(context, args) {
			// 第2引数がない(falseに評価される)なら、引数は渡さずに呼ぶ
			return !args ? notify.apply(context) : notify.apply(context, args);
		};
	}

	/**
	 * 引数に関数が含まれているか
	 *
	 * @private
	 * @param {Any} arg コールバック登録関数に渡された引数
	 */
	function hasValidCallback(arg) {
		if (!arg) {
			return false;
		}
		arg = wrapInArray(arg);
		for (var i = 0, l = arg.length; i < l; i++) {
			if (isFunction(arg[i])) {
				return true;
			}
		}
		return false;
	}

	/**
	 * 引数に指定されたpromiseまたはdeferredオブジェクトに対してコールバック登録関数をフックし、commonFailHandlerの機能を追加する。
	 * 既にフック済みのもの(prev)があればprevが持っているものに差し替える
	 *
	 * @private
	 * @param {Deferred|Promise} promise DeferredまたはPromise
	 * @param {Deferred} rootDfd 元のDeferred
	 *            既にフック済みのDeferredオブジェクト。第一引数がPromiseで、元のdeferredでフック済みならそっちのメソッドに差し替える
	 * @returns CFH機能を追加したDeferredまたはPromise
	 */
	function toCFHAware(promise, rootDfd) {
		// すでにtoCFHAware済みなら何もしないでpromiseを返す
		if (promise._h5UnwrappedCall) {
			return promise;
		}

		// progressを持っているか
		var hasNativeProgress = !!promise.progress;

		// 引数がDeferredオブジェクト(!=プロミスオブジェクト)の場合、
		// progress/notify/notifyWithがないなら追加。
		// jQuery1.6.x でもprogress/notify/notifyWithを使えるようにする。
		if (!hasNativeProgress && !isPromise(promise)) {
			addProgressFeatureForCompatibility(promise);
		} else if (rootDfd) {
			// rootDfdが指定されていればrootDfd.progressでpromise.progressを上書き
			promise.progress = rootDfd.progress;
		}

		// failコールバックが1つ以上登録されたかどうかのフラグ
		var existFailHandler = false;
		//commonFailHandlerが発火済みかどうかのフラグ
		var isCommonFailHandlerFired = false;

		// ---------------------------------------------
		// 以下書き換える(フックする)必要のある関数を書き換える
		// ---------------------------------------------

		// jQueryが持っているもともとのコールバック登録メソッドを保持するオブジェクト
		var originalMethods = {};
		// フックしたメソッドを保持するオブジェクト
		var hookMethods = {};

		/**
		 * 指定されたメソッドを、フックされたコールバック登録関数を元に戻してから呼ぶ
		 *
		 * @private
		 * @memberOf Deferred
		 * @param {String} method メソッド名
		 * @param {Array|Any} args メソッドに渡す引数。Arrayで複数渡せる。引数1つならそのまま渡せる。
		 * @returns メソッドの戻り値
		 */
		promise._h5UnwrappedCall = rootDfd ? rootDfd._h5UnwrappedCall : function(method, args) {
			args = wrapInArray(args);
			// originalに戻す
			$.extend(promise, originalMethods);
			// originalに戻した状態でmethodを実行
			var ret = promise[method].apply(this, args);
			// フックされたものに戻す
			$.extend(promise, hookMethods);

			return ret;
		};

		// commonFailHandlerのフラグ管理のために関数を上書きするための関数
		function override(method) {
			if (rootDfd) {
				if (!rootDfd[method]) {
					return;
				}
				promise[method] = rootDfd[method];
				return;
			}
			var originalFunc = promise[method];
			originalMethods[method] = originalFunc;
			promise[method] = (function(_method) {
				return function() {
					if (!existFailHandler) {
						// failコールバックが渡されたかどうかチェック
						var failArgs = argsToArray(arguments);
						if (method === 'then' || method === 'pipe') {
							// thenまたはpipeならargの第2引数を見る
							failArgs = failArgs[1];
						}
						if (hasValidCallback(failArgs)) {
							existFailHandler = true;
						}
					}
					// オリジナルのコールバック登録メソッドを呼ぶ
					return promise._h5UnwrappedCall.call(this, method, argsToArray(arguments));
				};
			})(method);
			hookMethods[method] = promise[method];
		}

		// failコールバックを登録する可能性のある関数を上書き
		for (var i = 0, l = CFH_HOOK_METHODS.length; i < l; i++) {
			var prop = CFH_HOOK_METHODS[i];
			if (promise[prop]) {
				// cfhの管理をするための関数でオーバーライド
				override(prop);
			}
		}


		// pipeは戻り値が呼び出したpromise(またはdeferred)と違うので、
		// そのdeferred/promiseが持つメソッドの上書きをして返す関数にする。
		// jQuery1.6以下にない第3引数でのprogressコールバックの登録にも対応する。
		// rootDfdがあればrootDfd.pipeを持たせてあるので何もしない。
		if (promise.pipe && !rootDfd) {
			promise.pipe = function() {
				// pipeを呼ぶとpipeに登録した関数がプロミスを返した時にfailハンドラが内部で登録され、
				// そのプロミスについてのCommonFailHandlerが動作しなくなる (issue #250)
				// (1.8以降の動作の場合thenも同じ)
				// そのため、pipeはFW側で実装する

				// 新しくDeferredを生成する
				var newDeferred = h5.async.deferred();

				// コールバックの登録
				var fns = argsToArray(arguments);

				for (var i = 0, l = PIPE_CREATE_METHODS.length; i < l; i++) {
					var that = this;
					(function(fn, method, action) {
						var isFunc = isFunction(fn);
						// 登録するコールバック
						function callback(/* var_args */) {
							if (!isFunc) {
								// 関数で無かった場合は、渡された引数を次のコールバックにそのまま渡す
								newDeferred[action + 'With'](this, arguments);
								return;
							}
							var ret = fn.apply(this, arguments);
							if (ret && isFunction(ret.promise)) {
								toCFHAware(ret);
								// コールバックが返したプロミスについてコールバックを登録する
								ret.done(newDeferred.resolve);
								// _h5UnwrappedCallを使って、CFHの挙動を阻害しないようにfailハンドラを登録
								ret._h5UnwrappedCall('fail', newDeferred.reject);
								// jQuery1.6以下でh5を使わずに生成されたプロミスならprogressはないので、
								// progressメソッドがあるかチェックしてからprogressハンドラを登録
								isFunction(ret.progress) && ret.progress(newDeferred.notify);
							} else {
								// 戻り値はプロミスでなかった場合、戻り値を次のコールバックに渡す
								newDeferred[action + 'With'](this, [ret]);
							}
						}

						// コールバックを登録
						// fnが関数でないかつmethodがfailの場合は、CFHの動作を阻害しないようにfailハンドラを登録するため、
						// _h5UnwrappedCallを使う
						if (!isFunc && method === 'fail') {
							that._h5UnwrappedCall(method, callback);
						} else {
							that[method](callback);
						}
					})(fns[i], PIPE_CREATE_METHODS[i], PIPE_CREATE_ACTIONS[i]);
				}
				return newDeferred.promise();
			};
			hookMethods.pipe = promise.pipe;
		}

		// thenは戻り値が呼び出したpromise(またはdeferred)と違う場合(jQuery1.8以降)、
		// そのdeferred/promiseが持つメソッドの上書きをして返す関数にする
		// jQuery1.6対応で、第3引数にprogressFilterが指定されていればそれを登録する
		// rootDfdがあればrootDfd.thenを持たせてあるので何もしない
		if (promise.then && !rootDfd) {
			var then = promise.then;
			// 1.8以降の場合 thenはpipeと同じで、別のdeferredに基づくpromiseを生成して返す(then===pipe)
			promise.then = isThenReturnsNewPromise ? promise.pipe : function(/* var_args */) {
				// 1.7以前の場合
				// jQuery1.7以前は、thenを呼んだ時のthisが返ってくる(deferredから呼んだ場合はdeferredオブジェクトが返る)。
				var args = arguments;
				var ret = then.apply(this, args);

				// 第3引数にprogressFilterが指定されていて、かつprogressメソッドがjQueryにない(1.6以前)場合
				// promise.progressに登録する
				if (!hasNativeProgress && hasValidCallback(args[2])) {
					promise.progress.call(promise, args[2]);
				}
				// そのままthis(=ret)を返す
				return ret;
			};
			hookMethods.then = promise.then;
		}

		// reject/rejectWith
		function createReject(rejectFunc) {
			return function(/* var_args */) {
				var commonFailHandler = h5.settings.commonFailHandler;
				// failコールバックが1つもない、かつcommonFailHandlerがある場合は、commonFailHandlerを登録する
				if (!existFailHandler && commonFailHandler && !isCommonFailHandlerFired) {
					promise.fail.call(this, commonFailHandler);
					isCommonFailHandlerFired = true;
				}
				return rejectFunc.apply(this, arguments);
			};
		}

		// reject
		if (promise.reject) {
			if (rootDfd && rootDfd.reject) {
				promise.reject = rootDfd.reject;
			} else {
				promise.reject = createReject(promise.reject);
			}
		}

		// rejectWith
		if (promise.rejectWith) {
			if (rootDfd && rootDfd.rejectWith) {
				promise.rejectWith = rootDfd.rejectWith;
			} else {
				promise.rejectWith = createReject(promise.rejectWith);
			}
		}

		// promise
		if (promise.promise) {
			if (rootDfd && rootDfd.promise) {
				promise.promise = rootDfd.promise;
			} else {
				var originalPromise = promise.promise;
				promise.promise = function(/* var_args */) {
					// toCFHAwareで上書く必要のある関数を上書いてから返す
					return toCFHAware(originalPromise.apply(this, arguments), promise);
				};
			}
		}
		return promise;
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	/**
	 * 登録された共通のエラー処理(<a href="h5.settings.html#commonFailHandler">h5.settings.commonFailHandler</a>)を実行できるDeferredオブジェクトを返します。<br>
	 * Deferredに notify() / notifyWith() / progress() メソッドがない場合は、追加したオブジェクトを返します。
	 *
	 * @returns {Deferred} Deferredオブジェクト
	 * @name deferred
	 * @function
	 * @memberOf h5.async
	 */
	var deferred = function() {
		var rawDfd = $.Deferred();
		return toCFHAware(rawDfd);

	};

	/**
	 * オブジェクトがPromiseオブジェクトであるかどうかを返します。<br />
	 * オブジェクトがDeferredオブジェクトの場合、falseが返ります。
	 *
	 * @param {Object} object オブジェクト
	 * @returns {Boolean} オブジェクトがPromiseオブジェクトであるかどうか
	 * @name isPromise
	 * @function
	 * @memberOf h5.async
	 */
	var isPromise = function(object) {
		return !!object && object.done && object.fail && !object.resolve && !object.reject;
	};

	/**
	 * 指定された回数ごとにループを抜けブラウザに制御を戻すユーティリティメソッドです。<br>
	 * また、callbackで渡された関数が{Promise}を返した場合、その{Promise}が終了するまで次のループの実行を待機します。
	 *
	 * @param {Any[]} array 配列
	 * @param {Function} callback コールバック関数。<br />
	 *            コールバックには引数として現在のインデックス、現在の値、ループコントローラが渡されます。<br />
	 *            callback(index, value, loopControl) <br />
	 *            loopControlは以下の3つのメソッドを持っています。<br />
	 *            <ul>
	 *            <li>pause - 処理の途中でポーズをかけます。</li>
	 *            <li>resume - ポーズを解除し処理を再開します。</li>
	 *            <li>stop - 処理を中断します。1度stopで中断すると再開することはできません。</li>
	 *            </ul>
	 * @param {Number} [suspendOnTimes=20] 何回ごとにループを抜けるか。デフォルトは20回です。
	 * @returns {Promise} Promiseオブジェクト
	 * @name loop
	 * @function
	 * @memberOf h5.async
	 */
	var loop = function(array, callback, suspendOnTimes) {
		if (!isArray(array)) {
			throwFwError(ERR_CODE_NOT_ARRAY);
		}
		var dfd = deferred();
		// 何回ごとにループを抜けるか。デフォルトは20回
		var st = $.type(suspendOnTimes) === 'number' ? suspendOnTimes : 20;
		var index = 0;
		var len = array.length;
		var execute, loopControl = null;
		var each = function() {
			if (index === len) {
				dfd.resolve(array);
				return;
			}
			var ret = callback.call(array, index, array[index], loopControl);
			index++;
			if (isPromise(ret)) {
				ret.done(function() {
					execute();
				}).fail(function() {
					dfd.reject(array);
				});
			} else {
				execute();
			}
		};
		var async = function() {
			setTimeout(function() {
				var i = index - 1;
				if (index > 0) {
					dfd.notify({
						data: array,
						index: i,
						value: array[i]
					});
				}
				each();
			}, 0);
		};
		var pause = false;
		execute = function() {
			if (pause) {
				return;
			}
			index % st === 0 ? async() : each();
		};
		var stopFlag = false;
		loopControl = {
			resume: function() {
				if (!stopFlag && pause) {
					pause = false;
					execute();
				}
			},
			pause: function() {
				pause = true;
			},
			stop: function() {
				stopFlag = true;
				dfd.resolve(array);
			}
		};
		async();
		return dfd.promise();
	};

	/**
	 * 引数に指定した１つ以上のPromiseオブジェクトに基づいて、コールバックメソッドを実行します。
	 * <p>
	 * 引数に指定されたPromiseオブジェクトの挙動によって、以下のような処理を実行します。<br>
	 * <ul>
	 * <li>引数に指定されたPromiseオブジェクトのうち、１つでもreject()が実行されると、failコールバックを実行します。</li>
	 * <li>引数に指定されたすべてのPromiseオブジェクトの全てでresolve()が実行されると、doneコールバックを実行します。</li>
	 * <li>引数に指定されたPromiseオブジェクトでnotify()が実行されると、progressコールバックを実行します。</li>
	 * </ul>
	 * 本メソッドはjQuery.when()と同様の機能を持っており、同じように使うことができます。<br>
	 * ただし、以下のような違いがあります。
	 * <h4>jQuery.when()と相違点</h4>
	 * <ul>
	 * <li>failコールバックが未指定の場合、共通のエラー処理(<a
	 * href="./h5.settings.html#commonFailHandler">commonFailHandler</a>)を実行します。(※
	 * whenに渡したpromiseについてのcommonFailHandlerは動作しなくなります。)</li>
	 * <li>jQuery1.6.xを使用している場合、jQuery.when()では使用できないnotify/progressの機能を使用することができます。ただし、この機能を使用するには<a
	 * href="h5.async.html#deferred">h5.async.deferred()</a>によって生成されたDeferredのPromiseオブジェクトを引数に指定する必要があります。<br>
	 * </li>
	 * <li>引数の指定方法について、jQuery.when()は可変長のみなのに対し、本メソッドは可変長またはPromiseオブジェクトを持つ配列で指定することができます。</li>
	 * </ul>
	 * <h4>引数の指定方法</h4>
	 * 配列または可変長で、複数のPromiseオブジェクトを渡すことができます。<br>
	 * 例)
	 * <ul>
	 * <li>h5.async.when(p1, p2, p3); </li>
	 * <li>h5.async.when([p1, p2, p3]); </li>
	 * </ul>
	 * Promiseオブジェクト以外を渡した時は無視されます。<br>
	 * また、可変長と配列の組み合わせで指定することはできません。<br>
	 * <ul>
	 * <li>h5.async.when(p1, [p2, p3], p4);</li>
	 * </ul>
	 * のようなコードを書いた時、2番目の引数は「配列」であり「Promise」ではないので無視され、p1とp4のみ待ちます。<br>
	 * <br>
	 * また、配列が入れ子になっていても、再帰的に評価はしません。<br>
	 * <ul>
	 * <li>h5.async.when([pi, [p2, p3], p4])</li>
	 * </ul>
	 * と書いても、先の例と同様p1とp4のみ待ちます。
	 *
	 * @param {Promise} var_args Promiseオブジェクﾄ(可変長または配列で複数のPromiseを指定する)
	 * @returns {Promise} Promiseオブジェクト
	 * @name when
	 * @function
	 * @memberOf h5.async
	 */
	var when = function(/* var_args */) {
		var args = argsToArray(arguments);

		if (args.length === 1 && isArray(args[0])) {
			args = args[0];
		}
		var len = args.length;

		/* del begin */
		// 引数にpromise・deferredオブジェクト以外があった場合はログを出力します。
		for (var i = 0; i < len; i++) {
			// DeferredもPromiseも、promiseメソッドを持つので、
			// promiseメソッドがあるかどうかでDeferred/Promiseの両方を判定しています。
			if (!args[i] || !(args[i].promise && isFunction(args[i].promise))) {
				fwLogger.info(FW_LOG_H5_WHEN_INVALID_PARAMETER);
				break;
			}
		}
		/* del end */

		// $.when相当の機能を実装する。
		// 引数が一つでそれがプロミスだった場合は$.whenはそれをそのまま返しているが、
		// h5.async.whenではCFHAwareでprogressメソッドを持つpromiseを返す必要があるため、
		// 引数がいくつであろうと、新しくCFHAwareなdeferredオブジェクトを生成してそのpromiseを返す。
		var dfd = h5.async.deferred();
		var whenPromise = dfd.promise();

		// $.whenを呼び出して、dfdと紐づける
		var jqWhenRet = $.when.apply($, args).done(
				function(/* var_args */) {
					// jQuery1.7以下では、thisが$.whenの戻り値の元のdeferredになる。
					// (resolveWithで呼んでも同様。指定したコンテキストは無視される。)
					// そうなっていたら、thisを$.whenに紐づいたdeferredではなく、h5.async.whenのdeferredに差し替える
					dfd.resolveWith(this && this.promise && this.promise() === jqWhenRet ? dfd
							: this, argsToArray(arguments));
				}).fail(function(/* var_args */) {
			dfd.rejectWith(this, argsToArray(arguments));
		});

		// progressがある(jQuery1.7以降)ならそのままprogressも登録
		if (jqWhenRet.progress) {
			jqWhenRet.progress(function(/* ver_args */) {
				// jQuery1.7では、thisが$.whenの戻り値と同じインスタンス(プロミス)になる。
				// (notifyWithで呼んでも同様。指定したコンテキストは無視される。)
				// thisが$.whenの戻り値なら、h5.async.whenの戻り値のプロミスに差し替える
				dfd.notifyWith(this === jqWhenRet ? whenPromise : this, argsToArray(arguments));
			});
		} else {
			// progressがない(=jQuery1.6.x)なら、progress機能を追加

			// progressの引数になる配列。
			// pValuesにはあらかじめundefinedを入れておく($.whenと同じ。progressフィルタ内のarguments.lengthは常にargs.lengthと同じ)
			var pValues = [];
			for (var i = 0; i < len; i++) {
				pValues[i] = undefined;
			}
			function progressFunc(index) {
				// args中の該当するindexに値を格納した配列をprogressコールバックに渡す
				return function(value) {
					pValues[index] = arguments.length > 1 ? argsToArray(arguments) : value;
					// jQuery1.6では、jQuery1.7と同様の動作をするようにする。
					// thisはh5.async.whenの戻り値と同じ。
					dfd.notifyWith(whenPromise, pValues);
				};
			}
			for (var i = 0; i < len; i++) {
				var p = args[i];
				// progressはjQuery1.6で作られたdeferred/promiseだとないので、あるかどうかチェックして呼び出す
				if (p && isFunction(p.promise) && p.progress) {
					if (len > 1) {
						p.progress(progressFunc(i));
					} else {
						// 引数が1つなら、notifyで渡された引数は配列化せず、そのままwhenのprogressへスルーさせる
						p.progress(function(/* var_args */) {
							// thisはh5.async.whenの戻り値と同じ。
							dfd.notifyWith(whenPromise, argsToArray(arguments));
						});
					}
				}
			}
		}
		return whenPromise;
	};

	// =============================
	// Expose to window
	// =============================

	/**
	 * @namespace
	 * @name async
	 * @memberOf h5
	 */
	h5.u.obj.expose('h5.async', {
		deferred: deferred,
		when: when,
		isPromise: isPromise,
		loop: loop
	});

})();
/* ------ h5.ajax ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	// =============================
	// Development Only
	// =============================

	/* del begin */

	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	/**
	 * jqXHRからJqXHRWrapperにコピーしないプロパティ jqXHRのメソッドで非推奨であるもの。(deferredにないもの)
	 *
	 * @type {Array}
	 */
	var DEPRECATED_METHODS = ['error', 'success', 'complete'];

	/**
	 * ajaxの引数のオブジェクトでコールバックが記述されるプロパティ<br>
	 * コールバックの実行されるタイミング順に記述(completeが一番遅いタイミングで実行されるので最後)
	 *
	 * @type {Array}
	 */
	var CALLBACK_REGISTER_DELEGATE_METHODS = ['error', 'success', 'complete'];

	/**
	 * コールバック指定プロパティと、コールバック登録関数を対応させるオブジェクト
	 * <p>
	 * settingsに指定されたコールバックはdone,fail,alwaysで登録させる。<br>
	 * success -> done, error -> fail, complete -> always にそれぞれ対応。<br>
	 * (success,error,completeメソッドはjQuery1.8で非推奨になったため)。
	 * </p>
	 *
	 * @type Object
	 */
	var PROP_TO_METHOD_MAP = {
		success: 'done',
		error: 'fail',
		complete: 'always'
	};
	// =============================
	// Functions
	// =============================
	/**
	 * ajaxの引数に指定されたコールバックを指定するプロパティを外して、deferredに登録する
	 *
	 * @private
	 * @param {Object} settings ajaxに渡すオブジェクト
	 * @param {Deferred} dfd
	 */
	function delegateCallbackProperties(settings, dfd) {
		for (var i = 0, l = CALLBACK_REGISTER_DELEGATE_METHODS.length; i < l; i++) {
			var prop = CALLBACK_REGISTER_DELEGATE_METHODS[i];
			if (settings[prop]) {
				dfd[PROP_TO_METHOD_MAP[prop]](settings[prop]);
				settings[prop] = undefined;
			}
		}
	}

	/**
	 * jqXHRのプロパティをjqXHRWrapperにコピーする
	 * <p>
	 * includeFunction==trueなら関数プロパティはコピーしない。promiseからコピーする関数及び非推奨な関数はコピーしない。
	 * </p>
	 *
	 * @private
	 * @param {JqXHRWrapper} jqXHRWrapper
	 * @param {Object} jqXHR コピー元のjqXHR
	 * @param {Boolean} includeFunction 関数プロパティをコピーするかどうか(trueならコピー)
	 * @param {Promise} promise promiseが持つプロパティはコピーしない
	 */
	function copyJqXHRProperties(jqXHRWrapper, jqXHR, includeFunction) {
		// jqXHRの中身をコピー
		// 関数プロパティならapplyでオリジナルのjqXHRの関数を呼ぶ関数にする
		for ( var prop in jqXHR) {
			// includeFunction=falseの場合は関数はコピーしない。
			// includeFunction=trueの場合、
			// 非推奨なプロパティ以外をコピー
			if (jqXHR.hasOwnProperty(prop) && (includeFunction || !isFunction(jqXHR[prop]))
					&& $.inArray(prop, DEPRECATED_METHODS) === -1) {
				// 値をコピー
				jqXHRWrapper[prop] = jqXHR[prop];
			}
		}
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	/**
	 * jqXHRWrapper
	 * <p>
	 * このクラスは自分でnewすることはありません。 h5.ajax()の戻り値がこのクラスです。
	 * jqXHRをラップしているクラスで、jqXHRのメソッド、プロパティを使用することができます。
	 * </p>
	 * <p>jqXHRについての詳細は{@link http://api.jquery.com/jQuery.ajax/|jQuery.ajax() | jQuery API Documentation}をご覧ください。
	 * </p>
	 * <p>
	 * <strong>注意：</strong>jqXHRオブジェクトと違い、success, error, complete メソッドはありません(非推奨であるため)。 それぞれ、done,
	 * fail, always を使用して下さい。
	 * </p>
	 *
	 * @class
	 * @name JqXHRWrapper
	 */
	/**
	 * @private
	 * @param jqXHR
	 * @param dfd
	 */
	function JqXHRWrapper(jqXHR, dfd) {
		// オリジナルのjqXHRから値をコピー
		copyJqXHRProperties(this, jqXHR, true);

		// jqXHRWrapperをpromise化する
		// (jqXHRのdoneやfailは使用しない。promise化で上書かれる。)
		dfd.promise(this);

		// alwaysをオーバーライド
		// jQuery1.7.0のバグ(alwaysがjqXHRではなくpromiseを返すバグ)の対応
		// http://bugs.jquery.com/ticket/10723  "JQXHR.ALWAYS() RETURNS A PROMISE INSTEAD OF A JQXHR OBJECT"
		var originalAlways = this.always;
		this.always = function(/* var_args */) {
			originalAlways.apply(this, arguments);
			return this;
		};
	}

	/**
	 * HTTP通信を行います。
	 * <p>
	 * 基本的な使い方は、<a href="http://api.jquery.com/jQuery.ajax/">jQuery.ajax()</a>と同じです。戻り値はjqXHRをラップした
	 * <a href="JqXHRWrapper.html">JqXHRWrapper</a>クラスです。
	 * <p>
	 * <p>
	 * jQuery.ajax()と異なる点は共通のエラーハンドラが定義できることと、リトライオプションを指定できることです。
	 * </p>
	 * <br>
	 * <h3>共通のエラーハンドラ</h3>
	 * <p>
	 * <a href="h5.settings.html#commonFailHandler">h5.settings.commonFailHandler</a>に関数が設定されている場合、
	 * エラーコールバックが登録されないままajaxが失敗すると、h5.settings.commonFailHandlerに設定した関数が呼ばれます。
	 * </p>
	 * <br>
	 * <h3>リトライオプション</h3>
	 * <p>
	 * <a href="h5.settings.html#ajax">h5.settings.ajax</a>でリトライをする設定がしてあれば、リトライを行います(デフォルトはリトライを行わない)。<br>
	 * また、引数からもリトライの設定を指定することができ、h5.settings.ajaxの設定よりも優先します。
	 * </p>
	 * <code><pre>
	 * h5.ajax({
	 * 	url: 'hoge',
	 * 	cache: false		// jQuery.ajaxのオプション
	 * 	retryCount: 3,		// h5.ajaxで追加しているオプション。リトライ回数。
	 * 	retryInterval: 200	// h5.ajaxで追加しているオプション。リトライ間のインターバル。
	 * 	retryFilter: function()		// h5.ajaxで追加しているオプション。リトライ毎に実行される関数。
	 * });
	 * </pre></code>
	 * <p>
	 * リトライ回数の設定してある場合は、リトライ途中で通信に成功した場合はdoneコールバックが、 リトライ回数回リトライしても失敗した場合はfailコールバックが呼ばれます。
	 * </p>
	 * <p>
	 * 同期(async:false)で呼んだ時は、retryIntervalの値に関わらず即座に同期でリトライを行います。ajax通信結果は同期で返ってきます。
	 * </p>
	 *
	 * @param {Any} var_args jQuery.ajaxに渡す引数
	 * @returns {JqXHRWrapper} jqXHRWrapperオブジェクト
	 * @name ajax
	 * @function
	 * @memberOf h5
	 */
	function ajax(/* var_args */) {
		// $.ajax(settings)での呼び出しに統一する。
		var settings = {};
		var args = arguments;
		if (isString(args[0])) {
			// ajax(url,[settings]) での呼び出しなら、settings.urlを追加する。
			$.extend(settings, args[1]);
			// 第1引数のurlがsettings.urlより優先される($.ajaxと同じ)
			settings.url = args[0];
		} else {
			// 第一引数がurlでないならsettingsにsettingsをクローン
			$.extend(settings, args[0]);
		}
		// h5.settings.ajaxとマージ
		settings = $.extend({}, h5.settings.ajax, settings);

		// deferredオブジェクトの作成
		var dfd = h5.async.deferred();

		// settingsに指定されたコールバックを外して、deferredに登録する
		delegateCallbackProperties(settings, dfd);

		// $.ajaxの呼び出し。jqXHRを取得してjqXHRWrapperを作成。
		var jqXHR = $.ajax(settings);

		// jqXHRWrapperの作成
		var jqXHRWrapper = new JqXHRWrapper(jqXHR, dfd);

		/**
		 * リトライ時のdoneハンドラ。 成功時はリトライせずにresolveして終了
		 */
		function retryDone(_data, _textStatus, _jqXHR) {
			// jqXHRのプロパティの値をラッパーにコピーする
			// ラッパーは最終的なjqXHRの値を持てばいいので、resolveを呼ぶ直前で新しいjqXHRの値に変更する
			copyJqXHRProperties(jqXHRWrapper, _jqXHR);
			dfd.resolveWith(this, arguments);
		}

		/**
		 * リトライ時のfailハンドラ。 ステータスコードを見て、リトライするかどうかを決める。 リトライしないなら、dfd.reject()を呼んで終了。
		 */
		function retryFail(_jqXHR, _textStatus, _errorThrown) {
			if (settings.retryCount === 0 || settings.retryFilter.apply(this, arguments) === false) {
				// retryFilterがfalseを返した、
				// またはこれが最後のリトライ、
				// またはリトライ指定のない場合、
				// rejectして終了

				// jqXHRのプロパティの値をラッパーにコピー
				// ラッパーは最終的なjqXHRの値を持てばいいので、rejectを呼ぶ直前で新しいjqXHRの値に変更する
				copyJqXHRProperties(jqXHRWrapper, _jqXHR);
				dfd.rejectWith(this, arguments);
				return;
			}
			settings.retryCount--;
			if (this.async) {
				// 非同期ならretryIntervalミリ秒待機してリトライ
				var that = this;
				setTimeout(function() {
					$.ajax(that).done(retryDone).fail(retryFail);
				}, settings.retryInterval);
			} else {
				// 同期なら即リトライする
				// (同期で呼ばれたらリトライ指定があっても同期になるようにするためretryIntervalは無視する)
				$.ajax(this).done(retryDone).fail(retryFail);
			}
		}

		// コールバックを登録
		jqXHR.done(retryDone).fail(retryFail);

		// 戻り値はjqXHRをラップしたjqXHRWrapperオブジェクト
		return jqXHRWrapper;
	}

	// =============================
	// Expose to window
	// =============================

	h5.u.obj.expose('h5', {
		ajax: ajax
	});
})();
/* ------ h5.res ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/**
	 * リソースファイルの取得時に発生するエラー
	 */
	var ERR_CODE_RESOURCE_AJAX = 17000;

	/**
	 * タイムアウト時のエラー
	 */
	var ERR_CODE_RESOLVE_TIMEOUT = 17001;

	// ---------- EJSResolverのエラー ----------
	/** テンプレートファイルの内容読み込み時に発生するエラー */
	var ERR_CODE_TEMPLATE_FILE_NO_TEMPLATE = 7001;

	/** テンプレートIDが不正である時に発生するエラー */
	var ERR_CODE_TEMPLATE_INVALID_ID = 7002;

	/** テンプレートファイルの取得時に発生するエラー */
	var ERR_CODE_TEMPLATE_AJAX = 7003;

	/** テンプレートファイルにscriptタグ以外の記述がある */
	var ERR_CODE_TEMPLATE_FILE_INVALID_ELEMENT = 7011;

	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.res');

	/* del begin */
	/**
	 * 各エラーコードに対応するメッセージ
	 */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_RESOURCE_AJAX] = 'リソースファイルを取得できませんでした。ステータスコード:{0}, URL:{1}';

	// EJSResolverのエラー
	errMsgMap[ERR_CODE_TEMPLATE_FILE_NO_TEMPLATE] = 'テンプレートファイルに<script>タグの記述がありません。テンプレートファイルは全て<script>タグで囲んだテンプレートを記述してください';
	errMsgMap[ERR_CODE_TEMPLATE_INVALID_ID] = 'テンプレートIDが指定されていません。空や空白でない文字列で指定してください。';
	errMsgMap[ERR_CODE_TEMPLATE_AJAX] = 'テンプレートファイルを取得できませんでした。ステータスコード:{0}, URL:{1}';
	errMsgMap[ERR_CODE_TEMPLATE_FILE_INVALID_ELEMENT] = 'テンプレートファイルに<script>タグ以外の記述があります。テンプレートファイルは全て<script>タグで囲んだテンプレートを記述してください';
	errMsgMap[ERR_CODE_RESOLVE_TIMEOUT] = 'リソースキー"{0}"の解決がタイムアウトしました';

	// メッセージの登録
	addFwErrorCodeMap(errMsgMap);
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	var getDeferred = h5.async.deferred;

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================

	/** リゾルバのリスト保持する配列 */
	var resolvers = [];

	/** リソースキーをキーに、解決済コンポーネントを持つマップ */
	var componentMap = {};

	/** registerされるのを待っているDeferredのマップ */
	waitingInfoMap = {};

	/** setImmediateでresolve処理を待っているdeferredの配列 */
	waitingForImmediateDeferred = [];

	/** 非同期でresolveするのを待機するタイマーID(タイマーを複数作成しないようにするため) */
	waitingImmediateTimer = null;

	/**
	 * ViewTemplateクラス
	 */
	function ViewTemplate(id, content) {
		this.id = id;
		this.content = content;
	}

	/**
	 * ResourceCacheクラス
	 */
	function ResourceCache(url, path, content) {
		this.url = url;
		this.path = path;
		this.content = content;
	}

	/**
	 * リソースのキャッシュ機構
	 * <p>
	 * リソースをURL毎にキャッシュします。キャッシュ済みのものはそれを返し、そうでないものは新たにキャッシュして返します
	 * </p>
	 *
	 * @private
	 */
	var cacheManager = {
		/**
		 * キャッシュの最大数
		 */
		MAX_CACHE: 10,

		/**
		 * URLとリソースを格納するキャッシュ
		 */
		cache: {},

		/**
		 * 現在キャッシュしているURLを保持する配列。もっとも使用されていないURLが配列の先頭にくるようソートされています。(LRU)
		 */
		cacheUrls: [],

		/**
		 * 現在アクセス中のURL(絶対パス)をkeyにして、そのpromiseオブジェクトを持つ連想配列
		 */
		accessingUrls: {},

		/**
		 * リソースをキャッシュします。
		 *
		 * @param {ResourceCache} resource ResourceCacheインスタンス
		 */
		append: function(resource) {
			if (this.cacheUrls.length >= this.MAX_CACHE) {
				this.clearCache(this.cacheUrls[0]);
			}
			var url = resource.url;
			this.cache[url] = resource;
			this.cacheUrls.push(url);
		},

		/**
		 * 指定されたパスのキャッシュを削除します。
		 *
		 * @param {String} path ファイルパス
		 * @param {Boolean} isOnlyUrls trueを指定された場合、キャッシュは消さずに、キャッシュしているURLリストから引数に指定されたURLを削除します。
		 */
		clearCache: function(path, isOnlyUrls) {
			var url = toAbsoluteUrl(path);
			if (!isOnlyUrls) {
				delete this.cache[url];
			}
			for (var i = 0, len = this.cacheUrls.length; i < len; i++) {
				if (this.cacheUrls[i] === url) {
					this.cacheUrls.splice(i, 1);
					break;
				}
			}
		},

		/**
		 * キャッシュを全て削除します
		 */
		clearAllCache: function() {
			this.cacheUrls = [];
			this.cache = {};
		},

		/**
		 * キャッシュからリソースを取得
		 *
		 * @param {String} url ファイルの絶対パス
		 */
		getResourceFromCache: function(url) {
			var ret = this.cache[url];
			this.clearCache(url, true);
			this.cacheUrls.push(url);
			return ret;
		},

		/**
		 * urlからリソースを取得。プロミスを返し、ResourceCacheをハンドラに渡す
		 *
		 * @param {String} path
		 * @returns {Promise}
		 */
		loadResourceFromPath: function(path) {
			var absolutePath = toAbsoluteUrl(path);

			// 現在アクセス中のURLであれば、そのpromiseを返す
			if (this.accessingUrls[absolutePath]) {
				return this.accessingUrls[absolutePath];
			}

			var df = getDeferred();
			var promise = df.promise();
			this.accessingUrls[absolutePath] = promise;
			var manager = this;
			h5.ajax(path, {
				dataType: 'text'
			}).done(function(result, statusText, obj) {
				// アクセス中のURLのプロミスを保持するaccessingUrlsから、このURLのプロミスを削除する
				delete manager.accessingUrls[absolutePath];
				// ResourceCacheオブジェクトを作成してキャッシュに登録
				var resource = new ResourceCache(absolutePath, path, obj.responseText);
				manager.append(resource);
				df.resolve(resource);
			}).fail(function(e) {
				// アクセス中のURLのプロミスを保持するaccessingUrlsから、このURLのプロミスを削除する
				delete manager.accessingUrls[absolutePath];

				df.reject(createRejectReason(ERR_CODE_RESOURCE_AJAX, [e.status, absolutePath], {
					url: absolutePath,
					path: path,
					error: e
				}));
				return;
			});
			return promise;
		}
	};

	// =============================
	// Functions
	// =============================
	/**
	 * Dependencyクラス
	 * <p>
	 * <a href="h5.res.html#reequire">h5.res.dependsOn()</a>がこのクラスのインスタンスを返します。
	 * </p>
	 *
	 * @param {String} resourceKey
	 */
	function Dependency(resourceKey) {
		this._resourceKey = resourceKey;
		// TODO プロミスのインターフェイスを持つ必要ある…？あるならコメントアウトを外す
		// var dfd = getDeferred();
		// dfd.promise(this);
	}
	$.extend(Dependency.prototype, {
		/**
		 * resourceKeyに基づいて依存関係を解決します
		 * <p>
		 * 登録されているリゾルバでresolveできないリソースキーの場合はfalseを返します
		 * </p>
		 *
		 * @param {String} type
		 */
		resolve: function(type) {
			// リゾルバを特定する
			function resolveInner(resourceKey) {
				for (var i = 0, l = resolvers.length; i < l; i++) {
					if (type && type !== resolvers[i].type) {
						// typeが指定されている場合はtypeと一致するかどうか見る
						continue;
					}
					// typeが指定されていない場合は条件とマッチするか判定
					var test = resolvers[i].test;
					if (!type && test) {
						if ($.type(test) === 'regexp') {
							if (!test.test(resourceKey)) {
								continue;
							}
						} else {
							if (test(resourceKey) === false) {
								continue;
							}
						}
					}

					// リゾルバを実行
					return resolvers[i].resolver(resourceKey, type);
				}
				// false以外のものを返すリゾルバが無かった場合はfalseを返す
				return false;
			}

			if (!isArray(this._resourceKey)) {
				// リソースキーが配列でない場合
				return resolveInner(this._resourceKey);
			}

			// リソースキーが配列の場合
			var resourceKeys = this._resourceKey;
			var promises = [];
			for (var i = 0, l = resourceKeys.length; i < l; i++) {
				var resourceKey = resourceKeys[i];
				var ret = resolveInner(resourceKey);
				promises.push(ret);
			}
			var dfd = h5.async.deferred();
			waitForPromises(promises, function(results) {
				// 結果の配列、1番目の結果、2番目の結果、…となるように引数を生成
				if (!isArray(results)) {
					// 結果が配列でない場合(=リソースキーが長さ１の配列の場合)、配列にする
					results = [results];
				}
				results.unshift(results.slice(0));
				dfd.resolveWith(dfd, results);
			}, function(e) {
				dfd.reject(e);
			});
			return dfd.promise();
		},

		/**
		 * 指定されたリソースキーを返します
		 *
		 * @returns {String} リソースキー
		 */
		getKey: function() {
			return this._resourceKey;
		}
	});

	/**
	 * カレントを考慮したファイルパスの取得
	 *
	 * @param {String} filePath
	 * @returns {String}
	 */
	function getFilePath(filePath) {
		// './'で始まるパスが指定されていたら'./'を取り除いてbaseUrlを先頭に追加する
		filePath = filePath.indexOf('./') === 0 ? filePath.slice(2) : filePath;
		return (h5.settings.res.baseUrl || './') + filePath;
	}

	/**
	 * リソースの登録
	 *
	 * @param {String} key
	 * @param {Any} value
	 * @param {Boolean} [exposeToGlobal=false] グローバルに公開するか
	 * @param {String} [exposureName=null] グローバル公開名
	 */
	function register(key, value, exposeToGlobal, exposureName) {
		if (exposeToGlobal) {
			if (exposureName) {
				h5.u.obj.expose(exposureName, value);
			} else {
				h5.u.obj.expose(key, value);
			}
		}
		// コンポーネントマップに登録
		componentMap[key] = value;
		// このリソースキーに紐づくdeferredが既に解決済み(waitingInfoから削除済み)なら何もしない
		var waitingInfo = waitingInfoMap[key];
		if (!waitingInfo) {
			return;
		}
		delete waitingInfoMap[key];
		var dfd = waitingInfo.deferred;
		var timer = waitingInfo.timer;
		if (timer) {
			// タイムアウト待ちタイマーをクリア
			clearTimeout(timer);
		}

		// 読込後の処理(register()呼び出し後)等が実行された後に、
		// ユーザコードのdoneハンドラが動作するようにするためsetTimeout使用
		// 既に動作しているタイマーがあれば新たにタイマーは作らない
		waitingForImmediateDeferred.push({
			dfd: dfd,
			value: value
		});
		if (!waitingImmediateTimer) {
			waitingImmediateTimer = setTimeout(function() {
				waitingImmediateTimer = null;
				var dfds = waitingForImmediateDeferred
						.splice(0, waitingForImmediateDeferred.length);
				for (var i = 0, l = dfds.length; i < l; i++) {
					dfds[i].dfd.resolve(dfds[i].value);
				}
			}, 0);
		}
	}

	/**
	 * 名前空間からjsファイルをロードするリゾルバ
	 *
	 * @param {String} resourceKey
	 * @returns {Promise} 解決した名前空間オブジェクトをresolveで渡します
	 */
	function resolveNamespace(resourceKey) {
		var ret = componentMap[resourceKey] || h5.u.obj.getByPath(resourceKey);
		if (ret) {
			// 既に解決済みの場合はresolve済みのプロミスを返す
			return getDeferred().resolve(ret).promise();
		}
		// 現在解決待ちのリソースキーであれば、それを返す
		if (waitingInfoMap[resourceKey]) {
			return waitingInfoMap[resourceKey].deferred.promise();
		}
		// "."を"/"に変えてファイルパスを取得
		var filePath = getFilePath(resourceKey.replace(/\./g, '/')) + '.js';

		var dfd = getDeferred();
		// タイムアウト設定
		var timeoutTime = h5.settings.res.timeoutTime;
		var timer = null;
		if (timeoutTime > 0) {
			timer = setTimeout(function() {
				if (waitingInfoMap[resourceKey]) {
					delete waitingInfoMap[resourceKey];
					dfd.reject(createRejectReason(ERR_CODE_RESOLVE_TIMEOUT, [resourceKey]));
				}
			}, timeoutTime);
		}
		// registerされるのを待つ
		waitingInfoMap[resourceKey] = {
			deferred: dfd,
			timer: timer
		};
		var dep = this;

		h5.u.loadScript(filePath).done(function() {
			var ret = componentMap[resourceKey] || h5.u.obj.getByPath(resourceKey);
			if (ret && waitingInfoMap[resourceKey]) {
				componentMap[resourceKey] = ret;
				delete waitingInfoMap[resourceKey];
				clearTimeout(timer);
				dfd.resolve(ret);
				return;
			}
		}).fail(function(errorObj) {
			// loadScriptのエラー
			clearTimeout(timer);
			delete waitingInfoMap[resourceKey];
			dfd.reject(errorObj);
		});
		return dfd.promise();
	}

	/**
	 * ejsファイルリゾルバ
	 *
	 * @param {String} resourceKey
	 * @returns {Promise} 以下のようなオブジェクトをresolveで返します
	 *
	 * <pre><code>
	 * {
	 *  path: ロードしたファイルのパス,
	 * 	url: ロードしたファイルのURL(絶対パス),
	 * 	templates: [{id: テンプレートID, content: テンプレートの中身}, ...]
	 * }
	 * </code></pre>
	 */
	function resolveEJSTemplate(resourceKey) {
		var dfd = getDeferred();
		urlLoader.load(getFilePath(resourceKey)).done(function(resource) {
			// コンテンツからscript要素を取得
			var $elements = $(resource.content).filter(function() {
				// IE8以下で、要素内にSCRIPTタグが含まれていると、jQueryが</SCRIPT>をunknownElementとして扱ってしまう。
				// nodeTypeを見てコメントノードも除去して、tagNameが'/SCRIPT'のものも除去する。
				return this.nodeType === 1 && this.tagName.indexOf('/') !== 0;
			});
			var textResources = [];
			if ($elements.not('script[type="text/ejs"]').length > 0) {
				// テンプレート記述以外のタグがあ場合はエラー
				dfd.reject(createRejectReason(ERR_CODE_TEMPLATE_FILE_INVALID_ELEMENT, null, {
					url: resource.url,
					path: resource.path
				}));
				return;
			}
			if ($elements.length === 0) {
				// テンプレート記述が一つもない場合はエラー
				dfd.reject(createRejectReason(ERR_CODE_TEMPLATE_FILE_NO_TEMPLATE, null, {
					url: resource.url,
					path: resource.path
				}));
			}
			// script要素からViewTemplateを作成
			$elements.each(function() {
				var id = $.trim(this.id);
				if (!id) {
					dfd.reject(createRejectReason(ERR_CODE_TEMPLATE_INVALID_ID, null, {
						url: resource.url,
						path: resource.path
					}));
				}
				var content = $.trim(this.innerHTML);
				textResources.push(new ViewTemplate(id, content));
			});

			// resolveする
			dfd.resolve({
				url: resource.url,
				path: resource.path,
				templates: textResources
			});
		}).fail(
				function(errorObj) {
					// リソースの取得に失敗
					// ここにくるエラーオブジェクトはgetResource()のエラーなので、
					// テンプレートのロードが投げるエラー(Viewのエラー)にする
					// インスタンスは変更しないようにする
					var detail = errorObj.detail;
					var viewErrorObj = createRejectReason(ERR_CODE_TEMPLATE_AJAX, [
							detail.error.status, detail.url], detail);
					errorObj.code = viewErrorObj.code;
					errorObj.message = viewErrorObj.message;
					errorObj.detail = errorObj.detail;
					dfd.reject(errorObj);
				});
		return dfd.promise();
	}

	/**
	 * jsファイルのデフォルトのリゾルバを作成する
	 *
	 * @param {String} resourceKey
	 * @param {String} type
	 * @returns {Function} Viewリゾルバ
	 */
	function resolveJs(resourceKey, type) {
		// loadScriptでロードする
		return h5.u.loadScript(getFilePath(resourceKey));
	}
	/**
	 * cssファイルのデフォルトのリゾルバを作成する
	 *
	 * @param {String} resoruceKey
	 * @param {String} type
	 * @returns {Function} Viewリゾルバ
	 */
	function resolveCss(resourceKey, type) {
		var head = document.getElementsByTagName('head')[0];

		var cssNode = document.createElement('link');
		cssNode.type = 'text/css';
		cssNode.rel = 'stylesheet';
		cssNode.href = getFilePath(resourceKey);
		head.appendChild(cssNode);

		// 同期でresolve
		// TODO cssのロードを待機する必要ある…？
		return getDeferred().resolve(cssNode).promise();
	}

	/**
	 * 引数がDependencyクラスかどうか判定
	 *
	 * @param {Any} obj
	 * @returns {Boolean} Dependencyクラスかどうか
	 */
	function isDependency(obj) {
		return obj instanceof Dependency;
	}
	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/**
	 * キャッシュ機構を使用してURLへアクセスします
	 *
	 * @memberOf h5.res
	 * @name urlLoader
	 */
	var urlLoader = {
		/**
		 * 指定されたテンプレートパスからテンプレートを非同期で読み込みます。 テンプレートパスがキャッシュに存在する場合はキャッシュから読み込みます。
		 *
		 * @param {String} resourcePath リソースパス
		 * @returns {Object} Promiseオブジェクト
		 */
		load: function(resourcePath) {
			var absolutePath = toAbsoluteUrl(resourcePath);
			// キャッシュにある場合
			if (cacheManager.cache[absolutePath]) {
				// キャッシュから取得したリソースを返す
				// 新しくDeferredを作ってプロミスを返す
				return getDeferred().resolve(cacheManager.getResourceFromCache(absolutePath))
						.promise();
			}
			// キャッシュにない場合
			// urlからロードして、そのプロミスを返す
			return cacheManager.loadResourceFromPath(resourcePath);
		},

		/**
		 * URL(path)を指定してキャッシュをクリアする
		 *
		 * @param {String} path
		 */
		clearCache: function(path) {
			cacheManager.clearCache(path);
		},
		/**
		 * URLキャッシュをすべてクリアする
		 */
		clearAllCache: function() {
			cacheManager.clearAllCache();
		}
	};

	/**
	 * リソースキーから、Dependencyオブジェクトを返します
	 *
	 * @memberOf h5.res
	 * @param {String} resourceKey
	 * @returns {Dependency}
	 */
	function dependsOn(resourceKey) {
		return new Dependency(resourceKey);
	}

	/**
	 * リゾルバを追加します
	 *
	 * @param {String} type リゾルバのタイプ。リゾルバをタイプと紐づける。nullを指定した場合はtypeに紐づかないリゾルバを登録します。
	 * @param {RegExp|Function} test リソースキーがこのリゾルバにマッチするかどうかの正規表現、または関数
	 * @param {Function} resolver リゾルバ
	 */
	function addResolver(type, test, resolver) {
		if (resolver === undefined && isFunction(type)) {
			// 第1引数に関数が指定されていて第2引数の指定がない場合はtype指定無しのリゾルバとみなす
			// TODO とりあえずの実装です。引数の指定方法、引数チェック等、詳細仕様が決まり次第実装します。
			resolver = type;
			type = undefined;
		}
		// 先頭に追加する
		resolvers.unshift({
			type: type,
			test: test,
			resolver: resolver
		});
	}

	/**
	 * 指定されたリソースキーの解決を行います
	 *
	 * @memberOf h5.res
	 * @param {String|Array} resourceKey
	 * @returns {Promise}
	 */
	function get(resourceKey) {
		return h5.res.dependsOn(resourceKey).resolve();
	}

	// デフォルトリゾルバの登録
	addResolver('namespace', null, resolveNamespace);
	addResolver('ejsfile', /.*\.ejs(\?.*$|$)/, resolveEJSTemplate);
	addResolver('jsfile', /.*\.js(\?.*$|$)/, resolveJs);
	addResolver('cssfile', /.*\.css(\?.*$|$)/, resolveCss);

	// =============================
	// Expose to window
	// =============================

	/**
	 * @namespace
	 * @name res
	 * @memberOf h5
	 */
	h5.u.obj.expose('h5.res', {
		dependsOn: dependsOn,
		addResolver: addResolver,
		isDependency: isDependency,
		urlLoader: urlLoader,
		resolvers: resolvers,
		register: register,
		get: get
	});

})();
/* ------ h5.core.controller ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/**
	 * SVGの名前空間
	 */
	var SVG_XMLNS = 'http://www.w3.org/2000/svg';

	/**
	 * セレクタのタイプを表す定数 イベントコンテキストの中に格納する
	 */
	var SELECTOR_TYPE_CONST = {
		SELECTOR_TYPE_LOCAL: 1,
		SELECTOR_TYPE_GLOBAL: 2,
		SELECTOR_TYPE_OBJECT: 3
	};

	var SUFFIX_CONTROLLER = 'Controller';
	var SUFFIX_LOGIC = 'Logic';
	var EVENT_NAME_H5_TRACKSTART = 'h5trackstart';
	var EVENT_NAME_H5_TRACKMOVE = 'h5trackmove';
	var EVENT_NAME_H5_TRACKEND = 'h5trackend';
	var ROOT_ELEMENT_NAME = 'rootElement';

	var EVENT_NAME_TRIGGER_INDICATOR = 'triggerIndicator';

	/** グローバルセレクタ指定かどうかの判定に使用する正規表現 */
	var GLOBAL_SELECTOR_REGEXP = /^\{.*\}$/;

	/** イベント名がバインドリクエスト指定かどうかの判定に使用する正規表現 */
	var BIND_REQUESTED_REGEXP = /^\[.*\]$/;

	/** インラインコメントテンプレートのコメントノードの開始文字列 */
	var COMMENT_BINDING_TARGET_MARKER = '{h5view ';

	// エラーコード
	/** エラーコード: テンプレートに渡すセレクタが不正（コントローラビューでテンプレートに渡せるセレクタはコントローラのイベントハンドラ記述と同じになりました(#349） */
	//var ERR_CODE_INVALID_TEMPLATE_SELECTOR = 6000;
	/** エラーコード: バインド対象が指定されていない */
	var ERR_CODE_BIND_TARGET_REQUIRED = 6001;
	/** エラーコード: bindControllerメソッドにコントローラではないオブジェクトが渡された（このエラーはver.1.1.3時点では通常発生しないので削除） */
	//var ERR_CODE_BIND_NOT_CONTROLLER = 6002;
	/** エラーコード: バインド対象となるDOMがない */
	var ERR_CODE_BIND_NO_TARGET = 6003;
	/** エラーコード: バインド対象となるDOMが複数存在する */
	var ERR_CODE_BIND_TOO_MANY_TARGET = 6004;
	/** エラーコード: 指定された引数の数が少ない */
	var ERR_CODE_TOO_FEW_ARGUMENTS = 6005;
	/** エラーコード: コントローラの名前が指定されていない */
	var ERR_CODE_INVALID_CONTROLLER_NAME = 6006;
	/** エラーコード: コントローラの初期化パラメータが不正 */
	var ERR_CODE_CONTROLLER_INVALID_INIT_PARAM = 6007;
	/** エラーコード: 既にコントローラ化されている */
	var ERR_CODE_CONTROLLER_ALREADY_CREATED = 6008;
	/** エラーコード: コントローラの参照が循環している */
	var ERR_CODE_CONTROLLER_CIRCULAR_REF = 6009;
	/** エラーコード: ロジックの参照が循環している */
	var ERR_CODE_LOGIC_CIRCULAR_REF = 6010;
	/** エラーコード: コントローラ化によって追加されるプロパティと名前が重複している */
	var ERR_CODE_CONTROLLER_SAME_PROPERTY = 6011;
	/** エラーコード: イベントハンドラのセレクタに{this}が指定されている */
	var ERR_CODE_EVENT_HANDLER_SELECTOR_THIS = 6012;
	/** エラーコード: あるセレクタに対して重複したイベントハンドラが設定されている */
	var ERR_CODE_SAME_EVENT_HANDLER = 6013;
	/** エラーコード: ロジックの名前に文字列が指定されていない */
	var ERR_CODE_INVALID_LOGIC_NAME = 6017;
	/** エラーコード: 既にロジック化されている */
	var ERR_CODE_LOGIC_ALREADY_CREATED = 6018;
	/** エラーコード: exposeする際にコントローラ、もしくはロジックの名前がない */
	var ERR_CODE_EXPOSE_NAME_REQUIRED = 6019;
	/** エラーコード: Viewモジュールが組み込まれていない */
	var ERR_CODE_NOT_VIEW = 6029;
	/** エラーコード：バインド対象を指定する引数に文字列、オブジェクト、配列以外が渡された */
	var ERR_CODE_BIND_TARGET_ILLEGAL = 6030;
	/** エラーコード：ルートコントローラ以外ではcontroller.bind()/unbind()/dispose()はできない */
	var ERR_CODE_BIND_UNBIND_DISPOSE_ROOT_ONLY = 6031;
	/** エラーコード：コントローラメソッドは最低2つの引数が必要 */
	var ERR_CODE_CONTROLLER_TOO_FEW_ARGS = 6032;
	/** エラーコード：コントローラの初期化処理がユーザーコードによって中断された(__initや__readyで返したプロミスがrejectした) */
	var ERR_CODE_CONTROLLER_INIT_REJECTED_BY_USER = 6033;
	/** エラーコード：コントローラのバインド対象がノードではない */
	var ERR_CODE_BIND_NOT_NODE = 6034;
	/** エラーコード：ルートエレメント未設定もしくはunbindされたコントローラで使用できないメソッドが呼ばれた */
	var ERR_CODE_METHOD_OF_NO_ROOTELEMENT_CONTROLLER = 6035;
	/** エラーコード：disposeされたコントローラで使用できないメソッドが呼ばれた */
	var ERR_CODE_METHOD_OF_DISPOSED_CONTROLLER = 6036;
	/** エラーコード：unbindは__constructでは呼べない */
	var ERR_CODE_CONSTRUCT_CANNOT_CALL_UNBIND = 6037;
	/** エラーコード：コントローラの終了処理がユーザーコードによって中断された(__disposeで返したプロミスがrejectした) */
	var ERR_CODE_CONTROLLER_DISPOSE_REJECTED_BY_USER = 6038;
	/** エラーコード：manageChildの引数にコントローラインスタンス以外が渡された */
	var ERR_CODE_CONTROLLER_MANAGE_CHILD_NOT_CONTROLLER = 6039;
	/** エラーコード：unbindされたコントローラをmanageChildしようとした */
	var ERR_CODE_CONTROLLER_MANAGE_CHILD_UNBINDED_CONTROLLER = 6040;
	/** エラーコード：unbindされたコントローラのmanageChildが呼ばれた */
	var ERR_CODE_CONTROLLER_MANAGE_CHILD_BY_UNBINDED_CONTROLLER = 6041;
	/** エラーコード：manageChildの引数のコントローラインスタンスがルートコントローラじゃない */
	var ERR_CODE_CONTROLLER_MANAGE_CHILD_NOT_ROOT_CONTROLLER = 6042;
	/** エラーコード：unbindされたコントローラのunmanageChildが呼ばれた */
	var ERR_CODE_CONTROLLER_UNMANAGE_CHILD_BY_UNBINDED_CONTROLLER = 6043;
	/** エラーコード：unmanageChildの引数のコントローラインスタンスが自分の子コントローラじゃない */
	var ERR_CODE_CONTROLLER_UNMANAGE_CHILD_NOT_CHILD_CONTROLLER = 6044;
	/** エラーコード：unmanageChildの第1引数がルートエレメント未決定コントローラで、第2引数がfalse */
	var ERR_CODE_CONTROLLER_UNMANAGE_CHILD_NO_ROOT_ELEMENT = 6045;

	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.core');
	/* del begin */

	// ログメッセージ
	var FW_LOG_TEMPLATE_LOADED = 'コントローラ"{0}"のテンプレートの読み込みに成功しました。';
	var FW_LOG_TEMPLATE_LOAD_FAILED = 'コントローラ"{0}"のテンプレートの読み込みに失敗しました。URL：{1}';
	var FW_LOG_INIT_CONTROLLER_REJECTED = 'コントローラ"{0}"の{1}で返されたPromiseがfailしたため、コントローラの初期化を中断しdisposeしました。';
	var FW_LOG_INIT_CONTROLLER_ERROR = 'コントローラ"{0}"の初期化中にエラーが発生しました。{0}はdisposeされました。';
	var FW_LOG_INIT_CONTROLLER_BEGIN = 'コントローラ"{0}"の初期化を開始しました。';
	var FW_LOG_INIT_CONTROLLER_COMPLETE = 'コントローラ"{0}"の初期化が正常に完了しました。';
	var FW_LOG_INIT_CONTROLLER_THROWN_ERROR = 'コントローラ"{0}"の{1}内でエラーが発生したため、コントローラの初期化を中断しdisposeしました。';
	var FW_LOG_BIND_TARGET_NOT_FOUND = 'イベントのバインド対象が見つかりません。指定されたグローバルセレクタ：{0}';
	var FW_LOG_BIND_TARGET_INVALID = 'イベントハンドラのセットに失敗しました。指定されたオブジェクトがaddEventListenerメソッドを持っていません。対象のオブジェクト：{0}';

	// エラーコードマップ
	var errMsgMap = {};
	//errMsgMap[ERR_CODE_INVALID_TEMPLATE_SELECTOR] = 'update/append/prepend() の第1引数に"window", "navigator", または"window.", "navigator."で始まるセレクタは指定できません。';
	errMsgMap[ERR_CODE_BIND_TARGET_REQUIRED] = 'コントローラ"{0}"のバインド対象となる要素を指定して下さい。';
	//errMsgMap[ERR_CODE_BIND_NOT_CONTROLLER] = 'コントローラ化したオブジェクトを指定して下さい。';
	errMsgMap[ERR_CODE_BIND_NO_TARGET] = 'コントローラ"{0}"のバインド対象となる要素が存在しません。';
	errMsgMap[ERR_CODE_BIND_TOO_MANY_TARGET] = 'コントローラ"{0}"のバインド対象となる要素が2つ以上存在します。バインド対象は1つのみにしてください。';
	errMsgMap[ERR_CODE_TOO_FEW_ARGUMENTS] = '正しい数の引数を指定して下さい。';
	errMsgMap[ERR_CODE_INVALID_CONTROLLER_NAME] = 'コントローラの名前は必須です。コントローラの__nameにコントローラ名を空でない文字列で設定して下さい。';
	errMsgMap[ERR_CODE_CONTROLLER_INVALID_INIT_PARAM] = 'コントローラ"{0}"の初期化パラメータがプレーンオブジェクトではありません。初期化パラメータにはプレーンオブジェクトを設定してください。';
	errMsgMap[ERR_CODE_CONTROLLER_ALREADY_CREATED] = '指定されたオブジェクトは既にコントローラ化されています。';
	errMsgMap[ERR_CODE_CONTROLLER_CIRCULAR_REF] = 'コントローラ"{0}"で、参照が循環しているため、コントローラを生成できません。';
	errMsgMap[ERR_CODE_LOGIC_CIRCULAR_REF] = 'ロジック"{0}"で、参照が循環しているため、ロジックを生成できません。';
	errMsgMap[ERR_CODE_CONTROLLER_SAME_PROPERTY] = 'コントローラ"{0}"のプロパティ"{1}"はコントローラ化によって追加されるプロパティと名前が重複しています。';
	errMsgMap[ERR_CODE_EVENT_HANDLER_SELECTOR_THIS] = 'コントローラ"{0}"でセレクタ名にthisが指定されています。コントローラをバインドした要素自身を指定したい時はrootElementを指定してください。';
	errMsgMap[ERR_CODE_SAME_EVENT_HANDLER] = 'コントローラ"{0}"のセレクタ"{1}"に対して"{2}"というイベントハンドラが重複して設定されています。';
	errMsgMap[ERR_CODE_INVALID_LOGIC_NAME] = 'ロジック名は必須です。ロジックの__nameにロジック名を空でない文字列で設定して下さい。';
	errMsgMap[ERR_CODE_LOGIC_ALREADY_CREATED] = '指定されたオブジェクトは既にロジック化されています。';
	errMsgMap[ERR_CODE_EXPOSE_NAME_REQUIRED] = 'コントローラ、もしくはロジックの __name が設定されていません。';
	errMsgMap[ERR_CODE_NOT_VIEW] = 'テンプレートはViewモジュールがなければ使用できません。';
	errMsgMap[ERR_CODE_BIND_TARGET_ILLEGAL] = 'コントローラ"{0}"のバインド対象には、セレクタ文字列、または、オブジェクトを指定してください。';
	errMsgMap[ERR_CODE_BIND_UNBIND_DISPOSE_ROOT_ONLY] = 'コントローラのbind(), unbind()はルートコントローラでのみ使用可能です。';
	errMsgMap[ERR_CODE_CONTROLLER_TOO_FEW_ARGS] = 'h5.core.controller()メソッドは、バインドターゲットとコントローラ定義オブジェクトの2つが必須です。';
	errMsgMap[ERR_CODE_CONTROLLER_INIT_REJECTED_BY_USER] = 'コントローラ"{0}"の初期化処理がユーザによって中断されました。';
	errMsgMap[ERR_CODE_BIND_NOT_NODE] = 'コントローラ"{0}"のバインド対象がノードではありません。バインド対象に指定できるのはノードかdocumentオブジェクトのみです。';
	errMsgMap[ERR_CODE_METHOD_OF_NO_ROOTELEMENT_CONTROLLER] = 'ルートエレメントの設定されていないコントローラのメソッド{0}は実行できません。';
	errMsgMap[ERR_CODE_METHOD_OF_DISPOSED_CONTROLLER] = 'disposeされたコントローラのメソッド{0}は実行できません。';
	errMsgMap[ERR_CODE_CONSTRUCT_CANNOT_CALL_UNBIND] = 'unbind()メソッドは__constructから呼ぶことはできません。';
	errMsgMap[ERR_CODE_CONTROLLER_DISPOSE_REJECTED_BY_USER] = 'コントローラ"{0}"のdispose処理がユーザによって中断されました。';
	errMsgMap[ERR_CODE_CONTROLLER_MANAGE_CHILD_NOT_CONTROLLER] = 'manageChildの第1引数はコントローラインスタンスである必要があります。';
	errMsgMap[ERR_CODE_CONTROLLER_MANAGE_CHILD_UNBINDED_CONTROLLER] = 'アンバインドされたコントローラをmanageChildすることはできません';
	errMsgMap[ERR_CODE_CONTROLLER_MANAGE_CHILD_BY_UNBINDED_CONTROLLER] = 'アンバインドされたコントローラのmanageChildは呼び出せません';
	errMsgMap[ERR_CODE_CONTROLLER_MANAGE_CHILD_NOT_ROOT_CONTROLLER] = 'manageChildの第1引数はルートコントローラである必要があります。';
	errMsgMap[ERR_CODE_CONTROLLER_UNMANAGE_CHILD_BY_UNBINDED_CONTROLLER] = 'アンバインドされたコントローラのunmanageChildは呼び出せません';
	errMsgMap[ERR_CODE_CONTROLLER_UNMANAGE_CHILD_NOT_CHILD_CONTROLLER] = 'unmanageChildの第1引数は呼び出し側の子コントローラである必要があります。';
	errMsgMap[ERR_CODE_CONTROLLER_UNMANAGE_CHILD_NO_ROOT_ELEMENT] = 'ルートエレメントの決定していない子コントローラのunmanageChildは、第2引数にfalseを指定することはできません';
	addFwErrorCodeMap(errMsgMap);
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	var getDeferred = h5.async.deferred;
	var isPromise = h5.async.isPromise;
	var startsWith = h5.u.str.startsWith;
	var endsWith = h5.u.str.endsWith;
	var format = h5.u.str.format;
	var argsToArray = h5.u.obj.argsToArray;
	var isJQueryObject = h5.u.obj.isJQueryObject;
	var isDependency = h5.res.isDependency;

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	/**
	 * commonFailHandlerを発火させないために登録するdummyのfailハンドラ
	 */
	var dummyFailHandler = function() {
	//
	};

	// コントローラマネージャ。作成した時に値をセットしている。
	var controllerManager;

	// キャッシュマネージャ。作成した時に値をセットしている。
	var definitionCacheManager;

	/**
	 * マウス/タッチイベントについてh5track*イベントをトリガしたかどうかを管理するため、イベントを格納する配列
	 */
	var storedEvents = [];

	/**
	 * あるマウス/タッチイベントについてh5track*イベントをトリガ済みかのフラグを保持する配列<br>
	 * storedEventsに格納されているイベントオブジェクトに対応して、<br>
	 * [true, false, false] のように格納されている。
	 */
	var h5trackTriggeredFlags = [];

	/**
	 * touch-actionをサポートしているときの、そのプロパティ(touchActionまたはmsTouchAction)
	 */
	var touchActionProp = '';

	/**
	 * touch-action(または-ms-touch-action)プロパティがサポートされているか
	 */
	var isTouchActionSupported = (function() {
		// divを作って、styleにtouchActionまたはmsTouchActionがあるか判定する
		// いずれかがあった場合にtouchActionPropを設定して、trueを返す
		var div = document.createElement('div');
		if (typeof div.style.touchAction !== TYPE_OF_UNDEFINED) {
			touchActionProp = 'touchAction';
			return true;
		} else if (typeof div.style.msTouchAction !== TYPE_OF_UNDEFINED) {
			touchActionProp = 'msTouchAction';
			return true;
		}
		return false;
	})();

	/**
	 * コントローラ化時に呼ばれるフック関数の配列
	 */
	var controllerInstantiationHooks = [];

	// =============================
	// Functions
	// =============================
	/**
	 * 要素のtransformスタイルの指定を無効にする
	 *
	 * @private
	 * @param {DOM} element
	 */
	function clearTransformStyle(element) {
		if (element.style.transform != null) {
			element.style.transform = '';
		}
		if (element.style.mozTansform != null) {
			element.style.mozTansform = '';
		}
		if (element.style.webkitTansform != null) {
			element.style.webkitTansform = '';
		}
	}

	/**
	 * svg要素のboundingClientRectを取得した時にsvg要素自体の位置を得できるブラウザかどうか
	 * <p>
	 * (Firefox32以下、iOS5以下、Android対応のため。 issue #393)
	 * </p>
	 *
	 * @private
	 * @returns {Boolean}
	 */
	var isSVGOffsetCollect = (function() {
		var _isSVGOffsetCollect = null;
		return function() {
			if (_isSVGOffsetCollect != null) {
				// 判定済みなら判定済み結果を返す
				return _isSVGOffsetCollect;
			}
			// ダミーのsvg要素とrect要素を作って、正しく位置が取得できるかどうかの判定を行う
			var svg = document.createElementNS(SVG_XMLNS, 'svg');
			svg.setAttribute('width', 1);
			svg.setAttribute('height', 1);
			var rect = document.createElementNS(SVG_XMLNS, 'rect');
			rect.setAttribute('x', 1);
			rect.setAttribute('y', 1);
			rect.setAttribute('width', 1);
			rect.setAttribute('height', 1);
			// transformを空文字にして無効にする(cssで指定されていたとしても無効にして計算できるようにするため)
			clearTransformStyle(rect);

			$(function() {
				document.body.appendChild(svg);
				// svgのboudingClientRectのtopを取得
				var svgTop = svg.getBoundingClientRect().top;
				svg.appendChild(rect);
				// svg要素のboundingClientRectが正しく取得できていない場合、描画図形を包含する矩形を表している。
				// その場合、rectを追加するとsvgのboundingClientRectが変わるので、rect追加前とrect追加後の位置の差がある場合は
				// svg要素の位置が正しくとれないと判定する
				_isSVGOffsetCollect = svgTop === svg.getBoundingClientRect().top;
				// svg要素の削除
				document.body.removeChild(svg);
			});
			// document.ready前はnullを返す
			return _isSVGOffsetCollect;
		};
	})();

	// --------------------------------- コントローラ定義オブジェクトのvalidate関数 ---------------------------------
	/**
	 * コントローラ定義、ターゲット、初期化パラメータのチェックを行います(コントローラ名のチェック(__name)はチェック済み)
	 * <p>
	 * チェックを通らなかった場合はエラーを投げます
	 * </p>
	 *
	 * @param {Boolean} isRoot ルートコントローラかどうか
	 * @param {DOM|jQuery|String} targetElement
	 * @param {Object} controllerDefObj
	 * @param {String} controllerName
	 */
	function validateControllerDef(isRoot, targetElement, controllerDefObj, param, controllerName) {
		// コントローラ定義オブジェクトに、コントローラが追加するプロパティと重複するプロパティがあるかどうかチェック
		if (!controllerPropertyMap) {
			// 重複チェックが初めて呼ばれた時にコントローラプロパティマップを生成してチェックで使用する
			controllerPropertyMap = {};
			var tempInstance = new Controller(null, 'a');
			for ( var p in tempInstance) {
				if (tempInstance.hasOwnProperty(p) && p !== '__name' && p !== '__templates'
						&& p !== '__meta') {
					controllerPropertyMap[p] = 1;
				}
			}
			tempInstance = null;
			var proto = Controller.prototype;
			for ( var p in proto) {
				if (proto.hasOwnProperty(p)) {
					controllerPropertyMap[p] = null;
				}
			}
			proto = null;
		}
		for ( var prop in controllerDefObj) {
			if (prop in controllerPropertyMap) {
				// コントローラが追加するプロパティと同じプロパティ名のものがあればエラー
				throwFwError(ERR_CODE_CONTROLLER_SAME_PROPERTY, [controllerName, prop], {
					controllerDefObj: controllerDefObj
				});
			}
		}
	}

	/**
	 * コントローラ定義オブジェクトの子孫コントローラ定義が循環参照になっているかどうかをチェックします。
	 *
	 * @private
	 * @param {Object} controllerDefObject コントローラ定義オブジェクト
	 * @param {String} controllerName コントローラ名
	 */
	function validateControllerCircularRef(controllerDefObject, controllerName) {
		function validateCircular(controllerDef, ancestors) {
			if ($.inArray(controllerDef, ancestors) !== -1) {
				// 循環参照エラー
				throwFwError(ERR_CODE_CONTROLLER_CIRCULAR_REF, [controllerName], {
					controllerDefObj: controllerDefObject
				});
			}
			// 子コントローラをチェック
			doForEachChildControllers(controllerDef, function(controller) {
				validateCircular(controller, ancestors.concat([controllerDef]));
			}, true);
		}
		validateCircular(controllerDefObject, []);
	}

	/**
	 * ロジック定義が循環参照になっているかどうかをチェックします。
	 *
	 * @private
	 * @param {Object} rootLogicDef ロジック定義オブジェクト
	 */
	function validateLogicCircularRef(rootLogicDef) {
		function validateCircular(logic, ancestors) {
			if ($.inArray(logic, ancestors) !== -1) {
				// 循環参照エラー
				throwFwError(ERR_CODE_LOGIC_CIRCULAR_REF, [rootLogicDef.__name], {
					logicDefObj: rootLogicDef
				});
			}
			doForEachLogics(logic, function(child) {
				validateCircular(child, ancestors.concat(logic));
			});
		}
		validateCircular(rootLogicDef, []);
	}

	/**
	 * ターゲットエレメントの指定が正しいかどうかチェックします。正しくない場合はthrowFwError
	 *
	 * @private
	 * @param {DOM|jQuery|String} targetElement
	 * @param {Object} controllerDefObj コントローラ定義オブジェクト
	 * @param {String} controllerName コントローラ名
	 */
	function validateTargetElement(targetElement, controllerDefObj, controllerName) {
		// null,undefinedならエラー
		if (targetElement == null) {
			throwFwError(ERR_CODE_BIND_TARGET_REQUIRED, [controllerName], {
				controllerDefObj: controllerDefObj
			});
		}
		// 文字列でもObjectでもないならエラー
		if (!isString(targetElement) && typeof targetElement !== 'object') {
			throwFwError(ERR_CODE_BIND_TARGET_ILLEGAL, [controllerName], {
				controllerDefObj: controllerDefObj
			});
		}

		var $bindTargetElement = $(targetElement);
		// 要素が1つでない場合はエラー
		if ($bindTargetElement.length === 0) {
			throwFwError(ERR_CODE_BIND_NO_TARGET, [controllerName], {
				controllerDefObj: controllerDefObj
			});
		}
		// 要素が複数ある場合はエラー
		if ($bindTargetElement.length > 1) {
			throwFwError(ERR_CODE_BIND_TOO_MANY_TARGET, [controllerName], {
				controllerDefObj: controllerDefObj
			});
		}
		// ノードエレメントでない場合はエラー
		if ($bindTargetElement[0].nodeType !== NODE_TYPE_DOCUMENT
				&& $bindTargetElement[0].nodeType !== NODE_TYPE_ELEMENT) {
			throwFwError(ERR_CODE_BIND_NOT_NODE, [controllerName], {
				controllerDefObj: controllerDefObj
			});
		}
	}

	// ----------------------------- コントローラ定義オブジェクトのチェック関数ここまで -----------------------------

	/**
	 * 子コントローラRequestクラス
	 *
	 * @param {String} selector セレクタ
	 */
	function Request(selector) {
		var $target = $(selector);

		this._controller = null;

		// FIXME エラーメッセージ作成する
		if ($target.length === 0) {
			// 要素が0個の場合はnullにして終了
			this._targetElement = null;
			return;
		} else if ($target.length > 1) {
			// 要素が複数ある場合はエラー
			throwFwError(ERR_CODE_BIND_TOO_MANY_TARGET);
		} else if ($target[0].nodeType !== NODE_TYPE_DOCUMENT
				&& $target[0].nodeType !== NODE_TYPE_ELEMENT) {
			// ノードエレメントでない場合はエラー
			throwFwError(ERR_CODE_BIND_NOT_NODE);
		} else {
			this._targetElement = $target[0];
		}


		// 既にコントローラがバインドされているか
		var controllers = h5.core.controllerManager.getController(this._controller);
		if (controllers.length > 1) {
			// 複数バインドされている場合はエラー
			// TODO
			throwFwError();
		}
		if (controllers.length == 1) {
			this._controller = controllres[0];
		} else if (controllers.length === 0) {
			var controllerName = $target.data('h5-controller');
			this._controller = h5.res.dependsOn(controllerName);
		}
	}

	/**
	 * イベントコンテキストクラス イベントコンテキストの中に格納する
	 *
	 * @private
	 * @class
	 * @param {Controller} controller コントローラインスタンス
	 * @param {Event} event イベントオブジェクト
	 * @param {Array} evArg イベントハンドラに渡された引数(arguments)を配列にしたもの
	 * @param {String} selector イベントハンドラのバインドに使用されたセレクタ
	 * @param {Number} selectorType イベントハンドラのバインドに使用されたセレクタのタイプ(SELECTOR_TYPE_CONSTに定義されたもの)
	 */
	function EventContext(controller, event, evArg, selector, selectorType) {
		this.controller = controller;
		this.event = event;
		this.evArg = evArg;
		this.selector = selector;
		this.selectorType = selectorType;
	}
	// prototypeにセレクタのタイプを表す定数を追加
	$.extend(EventContext.prototype, SELECTOR_TYPE_CONST);

	/**
	 * コントローラがdisposeされていないことと、executeListenersを見てリスナーを実行するかどうかを決定するインターセプタ。
	 *
	 * @private
	 * @param {Object} invocation インヴォケーション
	 * @returns リスナーの戻り値
	 */
	function executeListenersInterceptor(invocation) {
		// disposeされていたら何もしない
		// disposeされているのにイベントハンドラが起きることがあるのでチェックしている。
		// jQueryはイベント発生時に探索したハンドラを実行しようとするので、
		// 途中のイベントハンドラでunbindしたハンドラも実行される。
		// あるイベントについて、コントローラでバインドしたイベントハンドラより先に実行されるイベントハンドラの中で
		// コントローラがdisposeされた場合、unbindしたコントローラのハンドラも実行され、ここの関数が実行される。
		// そのため、コントローラがdisposeされているかどうかのチェックが必要。
		if (isDisposed(this) || !this.__controllerContext.executeListeners) {
			return;
		}
		return invocation.proceed();
	}

	/**
	 * 指定されたオブジェクトの関数にアスペクトを織り込みます。
	 *
	 * @private
	 * @param {Object} defObj コントローラまたはロジックの定義オブジェクト
	 * @param {Object} prop プロパティ名.
	 * @param {Boolean} isEventHandler イベントハンドラかどうか
	 * @returns {Object} アスペクトを織り込んだ関数
	 */
	function weaveAspect(defObj, prop, isEventHandler) {
		var interceptors = getInterceptors(defObj.__name, prop);
		// イベントハンドラの場合、 enable/disableListeners()のために一番外側に制御用インターセプタを織り込む
		if (isEventHandler) {
			interceptors.push(executeListenersInterceptor);
		}
		return createWeavedFunction(defObj[prop], prop, interceptors);
	}

	/**
	 * 関数名とポイントカットを比べて、条件に合致すればインターセプタを返す.
	 *
	 * @private
	 * @param {String} targetName バインドする必要のある関数名.
	 * @param {Object} pcName ポイントカットで判別する対象名.
	 * @returns {Function[]} AOP用関数配列.
	 */
	function getInterceptors(targetName, pcName) {
		/** @type Any */
		var ret = [];
		var aspects = h5.settings.aspects;
		// 織り込むべきアスペクトがない場合はそのまま空の配列を返す
		if (!aspects || aspects.length === 0) {
			return ret;
		}
		aspects = wrapInArray(aspects);
		for (var i = aspects.length - 1; -1 < i; i--) {
			var aspect = aspects[i];
			if (aspect.target && !aspect.compiledTarget.test(targetName)) {
				continue;
			}
			var interceptors = aspect.interceptors;
			if (aspect.pointCut && !aspect.compiledPointCut.test(pcName)) {
				continue;
			}
			if (!isArray(interceptors)) {
				ret.push(interceptors);
				continue;
			}
			for (var j = interceptors.length - 1; -1 < j; j--) {
				ret = ret.concat(interceptors[j]);
			}
		}
		return ret;
	}

	/**
	 * 基本となる関数にアスペクトを織り込んだ関数を返します。
	 *
	 * @private
	 * @param {Function} base 基本関数.
	 * @param {String} funcName 基本関数名.
	 * @param {Function[]} aspects AOP用関数配列.
	 * @returns {Function} AOP用関数を織り込んだ関数.
	 */
	function createWeavedFunction(base, funcName, aspects) {
		// 関数のウィービングを行う
		var weave = function(baseFunc, fName, aspect) {
			return function(/* var_args */) {
				var that = this;
				var invocation = {
					target: that,
					func: baseFunc,
					funcName: fName,
					args: arguments,
					proceed: function() {
						return baseFunc.apply(that, this.args);
					}
				};
				return aspect.call(that, invocation);
			};
		};

		var f = base;
		for (var i = 0, l = aspects.length; i < l; i++) {
			f = weave(f, funcName, aspects[i]);
		}
		return f;
	}

	/**
	 * セレクタがコントローラの外側の要素を指しているかどうかを返します。<br>
	 * (外側の要素 = true)
	 *
	 * @private
	 * @param {String} selector セレクタ
	 * @returns {Boolean} コントローラの外側の要素を指しているかどうか
	 */
	function isGlobalSelector(selector) {
		return GLOBAL_SELECTOR_REGEXP.test(selector);
	}

	/**
	 * イベント名がjQuery.bindを使って要素にイベントをバインドするかどうかを返します。
	 *
	 * @private
	 * @param {String} eventName イベント名
	 * @returns {Boolean} jQuery.bindを使って要素にイベントをバインドするかどうか
	 */
	function isBindRequestedEvent(eventName) {
		return BIND_REQUESTED_REGEXP.test(eventName);
	}

	/**
	 * セレクタから{}を外した文字列を返します。
	 *
	 * @private
	 * @param {String} selector セレクタ
	 * @returns {String} セレクタから{}を外した文字列
	 */
	function trimGlobalSelectorBracket(selector) {
		return $.trim(selector.substring(1, selector.length - 1));
	}

	/**
	 * イベント名から[]を外した文字列を返す
	 *
	 * @param {String} eventName イベント名
	 * @returns {String} イベント名から[]を外した文字列
	 */
	function trimBindEventBracket(eventName) {
		return $.trim(eventName.substring(1, eventName.length - 1));
	}

	/**
	 * 指定されたセレクタがwindow, window., document, document., navigator, navigator.
	 * で始まっていればそのオブジェクトを、そうでなければそのまま文字列を返します。
	 * window,document,navigatorは第2引数に指定されたdocumentが属するウィンドウのものを使用します。
	 * また、第3引数にコントローラが指定されていてかつselectorが"this."で始まっている場合は、コントローラ内のオブジェクトを取得します。
	 *
	 * @private
	 * @param {String} selector セレクタ
	 * @param {Document} doc
	 * @param {Controller} [controller] セレクタがthis.で始まっているときにコントローラの持つオブジェクトをターゲットにする
	 * @returns {Object|String} パスで指定されたオブジェクト、もしくは未変換の文字列
	 */
	function getGlobalSelectorTarget(selector, doc, controller) {
		if (controller && selector === ROOT_ELEMENT_NAME) {
			return controller.rootElement;
		}
		var specialObj = ['window', 'document', 'navigator'];
		for (var i = 0, len = specialObj.length; i < len; i++) {
			var s = specialObj[i];
			if (selector === s || startsWith(selector, s + '.')) {
				//特殊オブジェクトそのものを指定された場合またはwindow. などドット区切りで続いている場合
				return h5.u.obj.getByPath(selector, getWindowOfDocument(doc));
			}
		}
		// selectorが'this.'で始まっていて、かつcontrollerが指定されている場合はコントローラから取得する
		var controllerObjectPrefix = 'this.';
		if (controller && startsWith(selector, controllerObjectPrefix)) {
			return h5.u.obj.getByPath(selector.slice(controllerObjectPrefix.length), controller);
		}
		return selector;
	}

	/**
	 * 指定されたプロパティがイベントハンドラかどうかを返します。
	 *
	 * @private
	 * @param {Object} controllerDefObject コントローラ定義オブジェクト
	 * @param {String} prop プロパティ名
	 * @returns {Boolean} プロパティがイベントハンドラかどうか
	 */
	function isEventHandler(controllerDefObject, prop) {
		return prop.indexOf(' ') !== -1 && isFunction(controllerDefObject[prop]);
	}

	/**
	 * コントローラのプロパティが自分自身の子コントローラであるかどうかを返します。
	 *
	 * @private
	 * @param {Object} controller コントローラ
	 * @param {String} prop プロパティ名
	 * @param {Boolean} isDefObj 定義オブジェクトについての判定かどうか。定義オブジェクトならparentControllerが一致するかどうかは見ない。
	 * @returns {Boolean} コントローラのプロパティが第1引数のコントローラの子コントローラかどうか(true=子コントローラである)
	 */
	function isChildController(controller, prop, isDefObj) {
		var target = controller[prop];
		// プロパティがrootControllerまたはparentControllerの場合はfalse
		// __controllerContextがない(コントローラインスタンスではないまたはdispose済みコントローラインスタンス)の場合はfalse
		// 子コントローラでない(isRootがtrue)の場合はfalse
		// parentControllerを見て、自分の子供ならtrueを返す。
		// ただし、parentController未設定(コントローラ化処理の途中)の場合はtrueを返す。
		return endsWith(prop, SUFFIX_CONTROLLER)
				&& prop !== 'rootController'
				&& prop !== 'parentController'
				&& target
				&& (isDefObj || (target.__controllerContext && !target.__controllerContext.isRoot && (!target.parentController || target.parentController === controller)));
	}

	/**
	 * ロジックのプロパティが自分自身の子ロジックであるかどうかを返します。
	 *
	 * @private
	 * @param {Object} logic ロジックまたはコントローラ(コントローラを指定した時は、そのコントローラが持つロジックかどうかを返す)
	 * @param {String} prop プロパティ名
	 * @returns {Boolean} ロジックのプロパティが第1引数のロジックの子ロジックかどうか(true=子ロジックである)
	 */
	function isChildLogic(logic, prop) {
		// hasOwnPropertyがtrueで、"Logic"で終わっているプロパティ名のものは子ロジック。ロジック化の対象になる。
		return logic.hasOwnProperty(prop) && endsWith(prop, SUFFIX_LOGIC)
	}

	/**
	 * 指定されたコントローラ直下の子コントローラについて、コールバックを実行します
	 *
	 * <pre>
	 * function(controller, parentController, prop) {}
	 * </pre>
	 *
	 * のような関数を指定してください。falseが返されたら中断します。
	 *
	 * @private
	 * @param {Object} controller
	 * @param {Function} callback 引数に各コントローラとプロパティ名が渡されます。
	 * @param {Boolean} isDefObj
	 *            定義オブジェクトについての実行かどうか。定義オブジェクトなら子コントローラを探索するときにparentControllerが一致するかどうかは見ない。
	 * @returns 中断された場合はfalseを返します
	 */
	function doForEachChildControllers(controller, callback, isDefObj) {
		// コントローラインスタンスなら__controllerContextから子コントローラを取得
		if (!isDefObj) {
			// disposeされていたら何もしない
			if (isDisposed(controller)) {
				return;
			}
			var childControllers = controller.__controllerContext.childControllers;
			for (var i = 0, l = childControllers.length; i < l; i++) {
				var childController = childControllers[i];
				var child = childController;
				if (false === callback(child, controller)) {
					return false;
				}
			}
			return;
		}

		// 定義オブジェクトならdefinitionCacheManagerからキャッシュを取得(ない場合はnull)
		var cache = definitionCacheManager.get(controller.__name);
		// キャッシュがあるなら、キャッシュを使ってループ
		if (cache) {
			for (var i = 0, l = cache.childControllerProperties.length; i < l; i++) {
				var prop = cache.childControllerProperties[i];
				var child = controller[prop];
				// __construct時点では子コントローラがセットされていない場合があるので、
				// その場合はcallbackは実行しない
				if (child && false === callback(controller[prop], controller, prop)) {
					return false;
				}
			}
			return;
		}
		// キャッシュがないなら探索しながらループ
		for ( var prop in controller) {
			if (isChildController(controller, prop, isDefObj)) {
				if (false === callback(controller[prop], controller, prop)) {
					return false;
				}
			}
		}
	}

	/**
	 * 指定されたロジック直下の子ロジックについて、コールバックを実行します
	 *
	 * <pre>
	 * function(logic, parentLogic, prop) {}
	 * </pre>
	 *
	 * のような関数を指定してください。falseが返されたら中断します。
	 *
	 * @private
	 * @param {Logic|Object} logic ロジックまたは、まだインスタンス化されていないロジック定義オブジェクト
	 * @param {Function} callback 引数に各ロジックとプロパティ名が渡されます。
	 * @returns 中断された場合はfalseを返します
	 */
	function doForEachLogics(logic, callback) {
		// キャッシュがあるなら、キャッシュを使ってループ
		var cache = definitionCacheManager.get(logic.__name);
		if (cache) {
			for (var i = 0, l = cache.logicProperties.length; i < l; i++) {
				var prop = cache.logicProperties[i];
				if (false === callback(logic[prop], logic, prop)) {
					return false;
				}
			}
			return;
		}
		// キャッシュがないなら探索しながらループ
		for ( var prop in logic) {
			if (isChildLogic(logic, prop)) {
				if (false === callback(logic[prop], logic, prop)) {
					return false;
				}
			}
		}
	}

	/**
	 * 指定されたコントローラ以下のコントローラについて、コールバックを実行します
	 *
	 * <pre>
	 * function(controller, parentController, prop) {}
	 * </pre>
	 *
	 * のような関数を指定してください。falseが返されたら中断します。
	 *
	 * @private
	 * @param {Object} controller
	 * @param {Function} callback 引数に各コントローラとプロパティ名が渡されます。
	 * @param {Controller} [_parent] 第1引数controllerの親コントローラ。再帰呼び出し時に受け取る変数です。
	 * @param {String} [_prop] _parentがcontrollerを指すプロパティ名。再帰呼び出し時に受け取る変数です。
	 * @returns コールバックがfalseを返して中断した場合はfalseを返します
	 */
	function doForEachControllerGroups(controller, callback, _parent, _prop) {
		if (callback.call(this, controller, _parent, _prop) === false) {
			return false;
		}
		function callbackWrapper(c, parent, prop) {
			if (doForEachControllerGroups(c, callback, parent, prop) === false) {
				return false;
			}
		}
		return doForEachChildControllers(controller, callbackWrapper);
	}

	/**
	 * 指定されたコントローラ以下のコントローラについて、深さ優先でコールバックを実行します
	 *
	 * <pre>
	 * function(controller, parentController, prop) {}
	 * </pre>
	 *
	 * のような関数を指定してください。falseが返されたら中断します。
	 *
	 * @private
	 * @param {Object} controller
	 * @param {Function} callback 引数に各コントローラとプロパティ名が渡されます。
	 * @param {Controller} [_parent] 第1引数controllerの親コントローラ。再帰呼び出し時に受け取る変数です。
	 * @param {String} [_prop] _parentがcontrollerを指すプロパティ名。再帰呼び出し時に受け取る変数です。
	 * @returns コールバックがfalseを返して中断した場合はfalseを返します
	 */
	function doForEachControllerGroupsDepthFirst(controller, callback, _parent, _prop) {
		function callbackWrapper(c, parent, prop) {
			if (!c || doForEachControllerGroupsDepthFirst(c, callback, parent, prop) === false) {
				return false;
			}
		}
		if (doForEachChildControllers(controller, callbackWrapper) === false) {
			return false;
		}
		if (callback.call(this, controller, _parent, _prop) === false) {
			return false;
		}
	}

	/**
	 * 指定されたコントローラの子コントローラが持つ、指定されたプロミスを取得します。
	 *
	 * @private
	 * @param {Object} controller コントローラ
	 * @param {String} propertyName プロパティ名(initPromise,postInitPromise,readyPromise)
	 * @returns {Promise[]} Promiseオブジェクト配列
	 */
	function getChildControllerPromises(controller, propertyName) {
		var promises = [];
		doForEachChildControllers(controller, function(c) {
			var promise = c[propertyName];
			if (promise) {
				promises.push(promise);
			}
		});
		return promises;
	}

	/**
	 * バインドマップに基づいてイベントハンドラをバインドします
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 */
	function bindByBindMap(controller) {
		var bindMap = controller.__controllerContext.cache.bindMap;
		var doc = getDocumentOf(controller.rootElement);
		for ( var p in bindMap) {
			var bindObjects = createBindObjects(controller, bindMap[p], controller[p]);
			for (var i = 0, l = bindObjects.length; i < l; i++) {
				bindByBindObject(bindObjects[i], doc);
			}
		}
	}

	/**
	 * イベントハンドラのバインドを行います。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @param {Object} eventHandlerInfo バインドマップに登録されているイベントハンドラの情報
	 * @param {Function} func イベントハンドラ
	 * @returns {Object[]} バインドオブジェクトの配列
	 */
	function createBindObjects(controller, eventHandlerInfo, func) {
		var selector = eventHandlerInfo.selector;
		var eventName = eventHandlerInfo.eventName;
		// ハンドラを取得(アスペクト適用済み)
		// この関数の戻り値になるバインドオブジェクトの配列
		// 結果は必ず配列になるようにする
		var bindObjects;
		switch (eventName) {
		case 'mousewheel':
			bindObjects = getNormalizeMouseWheelBindObj(controller, selector, eventName, func);
			break;
		case EVENT_NAME_H5_TRACKSTART:
		case EVENT_NAME_H5_TRACKMOVE:
		case EVENT_NAME_H5_TRACKEND:
			bindObjects = getH5TrackBindObj(controller, selector, eventName, func);
			break;
		default:
			bindObjects = getNormalBindObj(controller, selector, eventName, func);
			break;
		}
		// 配列にする
		if (!isArray(bindObjects)) {
			bindObjects = [bindObjects];
		}

		// イベントコンテキストを作成してからハンドラを呼び出すようにhandlerをラップする
		// unbindListにラップしたものが登録されるように、このタイミングで行う必要がある
		function wrapHandler(bindObj) {
			var handler = bindObj.handler;
			var c = bindObj.controller;
			bindObj.originalHandler = handler;
			bindObj.handler = function(/* var args */) {
				// isNativeBindがtrue(addEventListenerによるバインド)なら、イベントハンドラのthisをイベントハンドラの第2引数にする。
				// (DOM要素でないものはlistenerElementTypeに関わらずjQueryで包まない)
				// isNativeBindがfalse(jQueryのbindまたはdelegateによるバインド)なら
				// listenerElementTypeが1ならjQueryオブジェクト、そうでないならDOM要素(イベントハンドラのthis)を、イベントハンドラの第2引数にする
				// jQuery1.6.4の場合、currentTargetに正しく値が設定されていない場合があるため、
				// currentTargetではなくthisを使用している。(issue#338)
				var currentTargetShortcut = !bindObj.isNativeBind
						&& h5.settings.listenerElementType === 1 ? $(this) : this;
				handler.call(c, createEventContext(bindObj, arguments), currentTargetShortcut);
			};
		}
		for (var i = 0, l = bindObjects.length; i < l; i++) {
			var bindObject = bindObjects[i];
			// handlerをラップ
			wrapHandler(bindObject);
			// eventHandlerInfoから、bindObjに必要なものを持たせる
			bindObject.isBindRequested = eventHandlerInfo.isBindRequested;
			bindObject.isGlobal = eventHandlerInfo.isGlobal;
			bindObject.bindTarget = eventHandlerInfo.bindTarget;
			// コントローラを持たせる
			bindObject.controller = controller;
		}
		return bindObjects;
	}

	/**
	 * バインドオブジェクトに基づいてイベントハンドラをバインドします。
	 *
	 * @private
	 * @param {Object} bindObj バインドオブジェクト
	 * @param {Document} doc documentオブジェクト
	 */
	function bindByBindObject(bindObj, doc) {
		var controller = bindObj.controller;
		var rootElement = controller.rootElement;
		var selector = bindObj.selector;
		var eventName = bindObj.eventName;
		var handler = bindObj.handler;
		var useBind = bindObj.isBindRequested;
		var isGlobal = bindObj.isGlobal;
		var bindTarget = bindObj.bindTarget;

		if (bindTarget) {
			// bindTargetが指定されている場合は必ず直接バインド
			bindObj.evSelectorType = SELECTOR_TYPE_CONST.SELECTOR_TYPE_OBJECT;
			bindEvent(bindObj);
		} else if (isGlobal) {
			// グローバルなセレクタの場合
			var selectTarget = getGlobalSelectorTarget(selector, doc, controller);

			// バインド対象がオブジェクト、または直接バインド指定の場合、必ず直接バインドする
			if (useBind || !isString(selectTarget)) {
				// bindObjにselectorTypeを登録する
				bindObj.evSelectorType = SELECTOR_TYPE_CONST.SELECTOR_TYPE_OBJECT;

				bindObj.bindTarget = isString(selectTarget) ? $(selectTarget) : selectTarget;
				bindEvent(bindObj);
			} else {
				// bindObjにselectorTypeを登録する
				bindObj.evSelectorType = SELECTOR_TYPE_CONST.SELECTOR_TYPE_GLOBAL;

				$(doc).delegate(selectTarget, eventName, handler);
			}
			// selectorがグローバル指定の場合はcontext.selectorに{}を取り除いた文字列を格納する
			// selectorがオブジェクト指定(rootElement, window, document)の場合はオブジェクトを格納する
			bindObj.evSelector = selectTarget;
		} else {
			// selectorがグローバル指定でない場合
			// bindObjにselectorTypeを登録し、selectorは文字列を格納する
			bindObj.evSelectorType = SELECTOR_TYPE_CONST.SELECTOR_TYPE_LOCAL;
			bindObj.evSelector = selector;

			if (useBind) {
				bindObj.bindTarget = $(selector, rootElement);
				bindEvent(bindObj);
			} else {
				$(rootElement).delegate(selector, eventName, handler);
			}
		}

		// bindEventで、bindTargetが不正なためバインドできなかった場合は以降何もしない
		// (bindHandlersに不要なものを残さないようにするため)
		if (bindObj.isBindCanceled) {
			return;
		}

		// アンバインドマップにハンドラを追加
		// バインドした場合はバインドした要素・オブジェクトをbindTargetに覚えておく
		registerWithBoundHandlers(bindObj);

		// h5trackstartのバインド先のstyle.touchActionにh5.settings.trackstartTouchActionの値(デフォルト'none')を設定する
		// touchActionをサポートしていないなら何もしない
		// h5.settings.trackstartTouchActionがnullなら何もしない
		// TODO プラッガブル(どのイベントの時にどういう処理をするか)が設定できるようにする
		if (isTouchActionSupported && eventName === EVENT_NAME_H5_TRACKSTART
				&& h5.settings.trackstartTouchAction != null) {
			var $trackTarget = isGlobal ? $(bindObj.evSelector, doc) : $(bindObj.evSelector,
					rootElement);
			$trackTarget.each(function() {
				this.style[touchActionProp] = h5.settings.trackstartTouchAction;
			});
		}
	}

	/**
	 * バインドオブジェクトに基づいてイベントハンドラをアンバインドします。
	 *
	 * @private
	 * @param {Object} bindObj バインドオブジェクト
	 * @param {Document} doc documentオブジェクト
	 * @param {Boolean} shouldNotUnregister boundHandlersから指定されたバインドオブジェクトを削除しない時にtrueを指定する
	 */
	function unbindByBindObject(bindObj, doc, shouldNotUnregister) {
		var controller = bindObj.controller;
		var rootElement = controller.rootElement;
		var selector = bindObj.selector;
		var handler = bindObj.handler;
		var eventName = bindObj.eventName;
		var isGlobal = bindObj.isGlobal;
		var bindTarget = bindObj.bindTarget;
		if (bindTarget) {
			// オブジェクトまたは直接バインド指定されていた場合(===バインド時にbindメソッドを使った場合)は直接unbind
			unbindEvent(bindObj);
		} else if (isGlobal) {
			if (getWindowOfDocument(doc) == null) {
				// アンバインドする対象のdocumentがもうすでに閉じられている場合は何もしない
				return;
			}
			$(doc).undelegate(selector, eventName, handler);
		} else {
			$(rootElement).undelegate(selector, eventName, handler);
		}
		if (!shouldNotUnregister) {
			// バインド中のハンドラリストから削除
			var boundHandlers = controller.__controllerContext.boundHandlers;
			boundHandlers.splice($.inArray(bindObj, boundHandlers), 1);
		}
	}

	/**
	 * バインドマップに基づいてイベントハンドラをアンバインドします。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 */
	function unbindEventHandlers(controller) {
		var rootElement = controller.rootElement;
		if (!rootElement) {
			// ルートエレメントが設定される前のunbind(=イベントハンドリング前)なら何もしない
			return;
		}

		// ドキュメントはrootElementのownerDocument。rootElement自体がdocumentノードならrootElement。
		var doc = getDocumentOf(rootElement);
		var boundHandlers = controller.__controllerContext.boundHandlers;

		for (var i = 0, l = boundHandlers.length; i < l; i++) {
			var bindObj = boundHandlers[i];
			unbindByBindObject(bindObj, doc, true);
		}
		// バインド中のハンドラリストを空にする
		controller.__controllerContext.boundHandlers = [];
	}

	/**
	 * 指定されたフラグで子コントローラを含む全てのコントローラのexecuteListenersフラグを変更します。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @param {Boolean} flag フラグ
	 */
	function setExecuteListenersFlag(controller, flag) {
		doForEachControllerGroups(controller, function(c) {
			c.__controllerContext.executeListeners = flag;
		});
	}

	/**
	 * コントローラに定義されたライフサイクルイベントを呼び出す関数を作成する
	 *
	 * @param {Controller} controller
	 * @param {String} funcName __init, __postInit, __ready のいずれか
	 * @param {Function} callback ライフサイクルイベントの実行が終わった時(非同期ならresolveされた時)に実行する関数
	 * @returns {Function}
	 */
	function createLifecycleCaller(controller, funcName, callback) {
		return function() {
			var ret = null;
			var lifecycleFunc = controller[funcName];
			var controllerName = controller.__name;
			var isAlreadyExecuted = false;
			if (funcName === '__init') {
				isAlreadyExecuted = controller.isInit;
			} else if (funcName === '__postInit') {
				isAlreadyExecuted = controller.isPostInit;
			} else {
				isAlreadyExecuted = controller.isReady;
			}
			if (!isAlreadyExecuted && lifecycleFunc) {
				try {
					ret = controller[funcName](createInitializationContext(controller));
				} catch (e) {
					// ライフサイクルイベントの呼び出しで例外が投げられた
					fwLogger.error(FW_LOG_INIT_CONTROLLER_THROWN_ERROR, controllerName, funcName);

					// controllerをdispose
					disposeController(controller, e);
				}
			}
			if (ret && isFunction(ret.done) && isFunction(ret.fail)) {
				// ライフサイクルイベントがpromiseを返している場合
				// resolveされたらcallbackを実行
				ret.done(callback).fail(
						function(/* var_args */) {
							// rejectされた場合は連鎖的にdisposeする
							fwLogger.error(FW_LOG_INIT_CONTROLLER_REJECTED, controllerName,
									funcName);
							fwLogger.error(FW_LOG_INIT_CONTROLLER_ERROR,
									controller.rootController.__name);

							var rejectReason = createRejectReason(
									ERR_CODE_CONTROLLER_INIT_REJECTED_BY_USER, controllerName,
									argsToArray(arguments));

							// controllerをdispose
							disposeController(controller.rootController, null, rejectReason);
						});
			} else {
				// callbackを実行
				callback();
			}
		};
	}

	/**
	 * 非同期で実行するライフサイクル(__init, __postInit, __ready)イベントを実行する
	 *
	 * @private
	 * @param {Controller} controller コントローラ(ルートコントローラ)
	 * @returns {Promise[]} Promiseオブジェクト
	 * @param {String} funcName 非同期で実行するライフサイクル関数名。__init, __postInit, __readyのいずれか。
	 */
	function executeLifecycleEventChain(controller, funcName) {
		function execInner(c) {
			var callback, promises;

			// ライフサイクルイベント名で場合分けして、待機するプロミスの取得と実行するコールバックの作成を行う
			// __postInit, __readyは子から先に実行する
			if (funcName === '__init') {
				callback = createCallbackForInit(c);
				promises = getPromisesForInit(c);
			} else if (funcName === '__postInit') {
				callback = createCallbackForPostInit(c);
				promises = getPromisesForPostInit(c);
			} else {
				callback = createCallbackForReady(c);
				promises = getPromisesForReady(c);
			}

			// waitForPromisesで全てのプロミスが終わってからライフサイクルイベントの呼び出しを行う
			// promisesの中にpendingのpromiseが無い場合(空または全てのプロミスがresolve/reject済み)の場合、
			// ライフサイクルイベントの呼び出しは同期的に呼ばれる
			// ライフサイクルイベントの待機プロミスはコントローラに覚えさせておく
			// (unmanageChild時で待機プロミスが減った時に対応するため)
			var context = controller.__controllerContext;
			context.waitingPromisesManagerMap = context.waitingPromsiesManager || {};
			context.waitingPromisesManagerMap[funcName] = waitForPromises(promises,
					createLifecycleCaller(c, funcName, callback));
		}
		// すでにpromisesのいずれかが失敗している場合は、失敗した時にdisposeされているはず
		// disopseされていたら何もしない
		if (isDisposing(controller)) {
			return;
		}
		doForEachControllerGroups(controller, execInner);
	}

	/**
	 * __initイベントを実行するために必要なPromiseを返します。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @returns {Promise[]} Promiseオブジェクト
	 */
	function getPromisesForInit(controller) {
		// 自身のテンプレート用Promiseオブジェクトと、親コントローラのinitPromiseオブジェクトを返す
		var promises = [controller.preInitPromise];
		if (controller.parentController) {
			promises.push(controller.parentController.initPromise);
		}
		return promises;
	}

	/**
	 * __postInitイベントを実行するために必要なPromiseを返します
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @returns {Promise[]} Promiseオブジェクト
	 */
	function getPromisesForPostInit(controller) {
		// 子コントローラのpostInitPromiseを取得
		var promises = getChildControllerPromises(controller, 'postInitPromise');
		promises.push(controller.initPromise);
		return promises;
	}

	/**
	 * __readyイベントを実行するために必要なPromiseを返します
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @returns {Promise[]} Promiseオブジェクト
	 */
	function getPromisesForReady(controller) {
		// 子コントローラのreadyPromiseを取得
		var promises = getChildControllerPromises(controller, 'readyPromise');
		promises.push(controller.postInitPromise);
		return promises;
	}

	/**
	 * __init実行後に実行するコールバック関数を返します。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @returns {Function} 次に実行する__initを知らせるために、子コントローラの配列を返す関数を返します
	 */
	function createCallbackForInit(controller) {
		return function() {
			// disopseまたはunbindされていたら何もしない
			if (isUnbinding(controller)) {
				return;
			}

			/**
			 * 全コントローラのinitが終わっているかどうかチェックする関数
			 *
			 * @private
			 * @returns {boolean}
			 */
			function isAllInitExecuted() {
				// __initは親から順に実行しているので、コントローラがリーフノードの場合のみチェックすればよいが、
				// 動的に子コントローラが追加される場合もあるため、いずれのコントローラの__initが完了た場合もチェックする
				var ret = true;
				doForEachControllerGroups(controller.rootController, function(c) {
					ret = c.isInit;
					return ret;
				});
				return ret;
			}

			if (controller.isInit) {
				// このコントローラの__init後の処理がすでに実行済みであれば
				// 全コントローラの__initが終わっているかどうかチェックして__postInitを呼び出す
				if (isAllInitExecuted()) {
					triggerPostInit(controller.rootController);
				}
				return;
			}
			// isInitフラグを立てる
			controller.isInit = true;
			var initDfd = controller.__controllerContext.initDfd;
			// FW、ユーザともに使用しないので削除
			delete controller.__controllerContext.templatePromise;
			delete controller.__controllerContext.preInitDfd;
			delete controller.__controllerContext.initDfd;

			// 子コントローラのrootElementとviewを設定
			var rootElement = controller.rootElement;

			// 子コントローラ
			try {
				var meta = controller.__meta;
				var childControllers = controller.__controllerContext.childControllers;
				// メタのルートエレメント定義とコントローラインスタンスの紐付け
				for ( var p in meta) {
					if ($.inArray(controller[p], childControllers) !== -1) {
						// 子コントローラに一時的にルートエレメントのメタ定義を持たせる
						controller[p].__controllerContext.metaRootElement = meta[p]
								&& meta[p].rootElement;
					}
				}
				// ルートコントローラはrootElement設定済み
				doForEachChildControllers(controller, function(c, parent) {
					var metaRootElement = c.__controllerContext.metaRootElement;
					delete c.__controllerContext.metaRootElement;

					if (c.rootElement) {
						// ルートエレメント設定済みなら何もしない
						// (manageChildによる動的子コントローラの場合など、再設定しないようにする)
						return;
					}

					// ルートエレメントが__metaで指定されている場合は指定箇所、
					// そうでない場合は親と同じルートエレメントをターゲットにする
					var target = metaRootElement ? getBindTarget(metaRootElement, c, controller)
							: rootElement;
					// バインド箇所決定後には不要なので削除
					// ターゲット要素のチェック
					validateTargetElement(target, c.__controllerContext.controllerDef, c.__name);
					// ルートエレメントの設定
					c.rootElement = target;
					// コントローラのviewにコントローラを設定
					c.view.__controller = c;
				});
			} catch (e) {
				// エラーが起きたらコントローラをdispose
				disposeController(controller, e);
				return;
			}

			// initDfdをresolveする前に、この時点でコントローラツリー上の__initが終わっているかどうかチェック
			var shouldTriggerPostInit = isAllInitExecuted();

			// resolveして、次のコールバックがあれば次を実行
			initDfd.resolveWith(controller);

			// initPromiseのdoneハンドラでunbindされているかどうかチェック
			// unbindされていなくて全コントローラの__initが終わっていたら__postInitを呼び出す
			if (!isUnbinding(controller) && shouldTriggerPostInit) {
				triggerPostInit(controller.rootController);
			}
		};
	}

	/**
	 * __postInitイベントで実行するコールバック関数を返します。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @returns {Function} コールバック関数
	 */
	function createCallbackForPostInit(controller) {
		return function() {
			// disopseまたはunbindされていたら何もしない。
			if (isUnbinding(controller)) {
				return;
			}
			controller.isPostInit = true;

			// 動的に追加された子コントローラに対応するため、
			// 再度子コントローラのpostInitプロミスを取得して、その完了を待ってからpostInitDfdをresolveする
			var context = controller.__controllerContext;
			context.waitingPromsiesManager = context.waitingPromsiesManager || {};
			context.waitingPromsiesManager['__postInit'] = waitForPromises(
					getPromisesForPostInit(controller), function() {
						// unbindまたはdisposeされたかチェック
						if (isUnbinding(controller)) {
							return;
						}
						var postInitDfd = context.postInitDfd;
						if (!postInitDfd) {
							// 既に削除済み(=resolve済み)の場合は、以降の処理は実行済みなので何もしない
							return;
						}
						// FW、ユーザともに使用しないので削除してresolve
						delete context.postInitDfd;
						postInitDfd.resolveWith(controller);
						// postInitPromiseのdoneハンドラでunbindまたはdisposeされている場合は何もしない
						// また、すでにバインド実行済みなら何もしない
						if (isUnbinding(controller) || context.isExecutedBind) {
							return;
						}
						if (!context.isRoot) {
							// 子コントローラの場合
							if (!controller.rootController.isPostInit) {
								// 通常、この時点ではルートのpostInitは未完了であり、
								// 以降の処理(イベントハンドラのバインドとtriggerReady)は、
								// ルートのpostInit後の処理で行うので何もしない
								return;
							}
							// ただし、例えばrootの__readyのタイミングでこのコントローラがmanageChildで子コントローラになったなどの場合は、
							// この時点でルートのpostInit後の処理が終わっている。
							// その場合、このコントローラのイベントハンドラのバインドは自分で行い、
							// かつこのコントローラの__readyを実行するためtriggerReadyを呼び出す必要がある
							if (!controller.parentController.__meta
									|| controller.parentController.__meta.userHandlers !== false) {
								bindByBindMap(controller);
							}
							triggerReady(controller.rootController);
							return;
						}
						// ルートコントローラなら次のフェーズへ
						// イベントハンドラのバインド
						// メタのuseHandlers定義とコントローラインスタンスの紐付け
						var meta = controller.__meta;
						var childControllers = context.childControllers;
						for ( var p in meta) {
							if ($.inArray(controller[p], childControllers) !== -1) {
								// 子コントローラに一時的にルートエレメントのメタ定義を持たせる
								controller[p].__controllerContext.metaUseHandlers = meta[p]
										&& meta[p].useHandlers;
							}
						}
						doForEachControllerGroups(controller, function(c, parent) {
							var metaUseHandlers = c.__controllerContext.metaUseHandlers;
							delete c.__controllerContext.metaUseHandlers;
							// バインド処理をしたかどうか
							// manageChildによる動的子コントローラについて２重にバインドしないためのフラグ
							if (c.__controllerContext.isExecutedBind) {
								return;
							}
							c.__controllerContext.isExecutedBind = true;

							if (metaUseHandlers !== false) {
								// 親のuseHandlersでfalseが指定されていなければバインドを実行する
								bindByBindMap(c);
							}
						});
						// managed!==falseの場合のみh5controllerboundをトリガ
						// (managedがfalseならコントローラマネージャの管理対象ではないため、h5controllerboundイベントをトリガしない)
						if (context.managed !== false) {
							// h5controllerboundイベントをトリガ.
							$(controller.rootElement).trigger('h5controllerbound', controller);
							if (isUnbinding(controller)) {
								// イベントハンドラでunbindされたら終了
								return;
							}
						}
						// __readyの実行
						triggerReady(controller);
					});
			return;
		};
	}

	/**
	 * __readyイベントで実行するコールバック関数を返します。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @returns {Function} コールバック関数
	 */
	function createCallbackForReady(controller) {
		return function() {
			// disopseまたはunbindされていたら何もしない。
			if (isUnbinding(controller)) {
				return;
			}
			controller.isReady = true;

			// 動的に追加された子コントローラに対応するため、
			// 再度子コントローラのreadyプロミスを取得して、その完了を待ってからreadyDfdをresolveする
			var context = controller.__controllerContext;
			context.waitingPromsiesManager = context.waitingPromsiesManager || {};
			context.waitingPromsiesManager['__ready'] = waitForPromises(
					getPromisesForReady(controller), function() {
						// unbind,disposeされた場合は何もしない
						if (isUnbinding(controller)) {
							return;
						}

						var readyDfd = context.readyDfd;
						if (!readyDfd) {
							// 既に削除済み(=resolve済み)の場合は、以降の処理は実行済みなので何もしない
							return;
						}
						// FW、ユーザともに使用しないので削除してresolve
						delete context.readyDfd;
						readyDfd.resolveWith(controller);

						// readyPromiseのdoneハンドラでunbindまたはdisposeされている場合は何もしない
						// また、ルートコントローラでない場合も何もしない
						if (isUnbinding(controller) || !context.isRoot) {
							return;
						}
						// ルートコントローラであれば全ての処理が終了したことを表すイベント"h5controllerready"をトリガ
						$(controller.rootElement).trigger('h5controllerready', controller);
					});
		};
	}

	/**
	 * 指定された要素が文字列があれば、ルートエレメント、{}記法を考慮した要素をjQueryオブジェクト化して返します。 DOM要素、jQueryオブジェクトであれば、
	 * jQueryオブジェクト化して(指定要素がjQueryオブジェクトの場合、無駄な処理になるがコスト的には問題ない)返します。
	 *
	 * @private
	 * @param {String|DOM|jQuery} element セレクタ、DOM要素、jQueryオブジェクト
	 * @param {Controlelr} controller
	 * @returns {jQuery} jQueryオブジェクト
	 */
	function getTarget(element, controller) {
		if (!isString(element)) {
			return $(element);
		}
		var selector = $.trim(element);
		if (isGlobalSelector(selector)) {
			var s = trimGlobalSelectorBracket(selector);
			return $(getGlobalSelectorTarget(s, getDocumentOf(controller.rootElement), controller));
		}
		return $(controller.rootElement).find(element);
	}

	/**
	 * ハンドラをバインド済みリストに登録します。
	 *
	 * @private
	 * @param {Object} bindObj
	 * @param {Object} eventHandlerInfo イベントハンドラ情報
	 */
	function registerWithBoundHandlers(bindObj) {
		bindObj.controller.__controllerContext.boundHandlers.push(bindObj);
	}

	/**
	 * バインドオブジェクトを返します。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @param {String} selector セレクタ
	 * @param {String} eventName イベント名
	 * @param {Function} func ハンドラとして登録したい関数
	 * @returns {Object} バインドオブジェクト
	 *          <ul>
	 *          <li>bindObj.controller - コントローラ</li>
	 *          <li>bindObj.selector - セレクタ</li>
	 *          <li>bindObj.eventName - イベント名</li>
	 *          <li>bindObj.handler - イベントハンドラ</li>
	 *          </ul>
	 */
	function getNormalBindObj(controller, selector, eventName, func) {
		return {
			controller: controller,
			selector: selector,
			eventName: eventName,
			handler: func
		};
	}

	/**
	 * クラスブラウザな"mousewheel"イベントのためのバインドオブジェクトを返します。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @param {String} selector セレクタ
	 * @param {String} eventName イベント名
	 * @param {Function} func ハンドラとして登録したい関数
	 * @returns {Object} バインドオブジェクト
	 *          <ul>
	 *          <li>bindObj.controller - コントローラ</li>
	 *          <li>bindObj.selector - セレクタ</li>
	 *          <li>bindObj.eventName - イベント名</li>
	 *          <li>bindObj.handler - イベントハンドラ</li>
	 *          </ul>
	 */
	function getNormalizeMouseWheelBindObj(controller, selector, eventName, func) {
		return {
			controller: controller,
			selector: selector,
			// Firefoxには"mousewheel"イベントがない
			eventName: typeof document.onmousewheel === TYPE_OF_UNDEFINED ? 'DOMMouseScroll'
					: eventName,
			handler: function(context) {
				var event = context.event;
				// jQuery1.7以降ではwheelDeltaとdetailがjQueryEventにコピーされない。
				// hifive側でoriginalEventから取った値をコピーする
				if (event.wheelDelta == null && event.originalEvent
						&& event.originalEvent.wheelDelta != null) {
					event.wheelDelta = event.originalEvent.wheelDelta;
				}
				// Firefox用
				// wheelDeltaが無く、かつdetailに値がセットされているならwheelDeltaにdetailから計算した値を入れる
				if (event.wheelDelta == null && event.originalEvent
						&& event.originalEvent.detail != null) {
					event.wheelDelta = -event.originalEvent.detail * 40;
				}
				func.call(controller, context);
			}
		};
	}

	/**
	 * hifiveの独自イベント"h5trackstart", "h5trackmove", "h5trackend"のためのバインドオブジェクトを返します。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @param {String} selector セレクタ
	 * @param {String} eventName イベント名 h5trackstart,h5trackmove,h5trackendのいずれか
	 * @param {Function} func ハンドラとして登録したい関数
	 * @returns {Object|Object[]} バインドオブジェクト
	 *          <ul>
	 *          <li>bindObj.controller - コントローラ</li>
	 *          <li>bindObj.selector - セレクタ</li>
	 *          <li>bindObj.eventName - イベント名</li>
	 *          <li>bindObj.handler - イベントハンドラ</li>
	 *          </ul>
	 */
	function getH5TrackBindObj(controller, selector, eventName, func) {
		// タッチイベントがあるかどうか
		var hasTouchEvent = typeof document.ontouchstart !== TYPE_OF_UNDEFINED;
		if (eventName !== EVENT_NAME_H5_TRACKSTART) {
			// h5trackmove,h5trackendはh5trackstart時にバインドするのでここでmouseやtouchにバインドするbindObjは作らない
			// h5trackmoveまたはh5trackendのbindObjのみを返す
			return getNormalBindObj(controller, selector, eventName, function(context) {
				// マウスイベントによる発火なら場合はオフセットを正規化する
				var originalEventType = context.event.h5DelegatingEvent.type;
				if (originalEventType === 'mousemove' || originalEventType === 'mouseup') {
					var event = context.event;
					var offset = $(event.currentTarget).offset() || {
						left: 0,
						top: 0
					};
					event.offsetX = event.pageX - offset.left;
					event.offsetY = event.pageY - offset.top;
				}
				func.apply(this, arguments);
			});
		}

		function getEventType(en) {
			switch (en) {
			case 'touchstart':
			case 'mousedown':
				return EVENT_NAME_H5_TRACKSTART;
			case 'touchmove':
			case 'mousemove':
				return EVENT_NAME_H5_TRACKMOVE;
			case 'touchend':
			case 'mouseup':
				return EVENT_NAME_H5_TRACKEND;
			}
		}

		// jQuery.Eventオブジェクトのプロパティをコピーする。
		// 1.6.xの場合, "liveFired"というプロパティがあるがこれをコピーしてしまうとtriggerしてもイベントが発火しない。
		function copyEventObject(src, dest) {
			for ( var prop in src) {
				if (src.hasOwnProperty(prop) && !dest[prop] && prop !== 'target'
						&& prop !== 'currentTarget' && prop !== 'originalEvent'
						&& prop !== 'liveFired') {
					dest[prop] = src[prop];
				}
			}
			dest.h5DelegatingEvent = src;
		}

		var $document = $(getDocumentOf(controller.rootElement));

		/**
		 * トラックイベントの一連のイベントについてのbindObjを作る
		 *
		 * @private
		 * @returns {Objects[]}
		 */
		function getBindObjects() {
			// h5trackendイベントの最後でハンドラの除去を行う関数を格納するための変数
			var removeHandlers = null;
			var execute = false;
			function getHandler(en, eventTarget, setup) {
				return function(context) {
					var type = getEventType(en);
					var isStart = type === EVENT_NAME_H5_TRACKSTART;
					if (isStart && execute) {
						// スタートイベントが起きた時に実行中 = マルチタッチされた時なので、何もしない
						return;
					}

					// タッチイベントかどうか
					var isTouch = context.event.type.indexOf('touch') === 0;
					if (isTouch) {
						// タッチイベントの場合、イベントオブジェクトに座標系のプロパティを付加
						initTouchEventObject(context.event, en);
					}
					var newEvent = new $.Event(type);
					copyEventObject(context.event, newEvent);
					var target = context.event.target;
					if (eventTarget) {
						target = eventTarget;
					}
					if (setup) {
						setup(newEvent);
					}

					// ------------- h5track*のトリガ処理 -------------
					// originalEventがあればoriginalEvent、なければjQueryEventオブジェクトでh5track*をトリガしたかどうかのフラグを管理する
					var triggeredFlagEvent = context.event.originalEvent || context.event;

					if (isStart && $.inArray(triggeredFlagEvent, storedEvents) === -1) {
						// スタート時で、かつこのスタートイベントがstoredEventsに入っていないなら
						// トリガする前にトリガフラグ保管イベントのリセット(storedEventsに不要なイベントオブジェクトを残さないため)
						storedEvents = [];
						h5trackTriggeredFlags = [];
					}

					var index = $.inArray(triggeredFlagEvent, storedEvents);
					if (index === -1) {
						// storedEventsにイベントが登録されていなければ追加し、トリガ済みフラグにfalseをセットする
						index = storedEvents.push(triggeredFlagEvent) - 1;
						h5trackTriggeredFlags[index] = false;
					}
					// sotredEventsにイベントが登録されていれば、そのindexからトリガ済みフラグを取得する
					var triggeredFlag = h5trackTriggeredFlags[index];

					if (!triggeredFlag && (!isTouch || execute || isStart)) {
						// 親子コントローラで複数のイベントハンドラが同じイベントにバインドされているときに、
						// それぞれがトリガしてイベントハンドラがループしないように制御している。
						// マウス/タッチイベントがh5track*にトリガ済みではない時にトリガする。
						// タッチイベントの場合、h5track中でないのにmoveやtouchendが起きた時は何もしない。
						// タッチイベントの場合はターゲットにバインドしており(マウスの場合はdocument)、
						// バブリングによって同じイベントが再度トリガされるのを防ぐためである。

						// トリガ済みフラグを立てる
						h5trackTriggeredFlags[index] = true;
						// h5track*イベントをトリガ
						$(target).trigger(newEvent, context.evArg);
						execute = true;
					}

					// 不要なイベントオブジェクトを残さないため、
					// documentだったら現在のイベントとそのフラグをstoredEvents/h5trackTriggeredFlagsから外す
					// h5trackend時ならstoredEvents/h5trackTtriggeredFlagsをリセットする
					// (※ documentまでバブリングすればイベントオブジェクトを保管しておく必要がなくなるため)
					if (context.event.currentTarget === document) {
						if (type === EVENT_NAME_H5_TRACKEND) {
							storedEvents = [];
							h5trackTriggeredFlags = [];
						}
						var storedIndex = $.inArray(triggeredFlagEvent, storedEvents);
						if (storedIndex !== -1) {
							storedEvents.splice(index, 1);
							h5trackTriggeredFlags.splice(index, 1);
						}
					}
					// ------------- h5track*のトリガ処理 ここまで -------------

					if (isStart && execute) {
						// スタートイベント、かつ今h5trackstartをトリガしたところなら、
						// h5trackmove,endを登録

						newEvent.h5DelegatingEvent.preventDefault();
						var nt = newEvent.target;

						// 直前のh5track系イベントとの位置の差分を格納
						var ox = newEvent.clientX;
						var oy = newEvent.clientY;
						var setupDPos = function(ev) {
							var cx = ev.clientX;
							var cy = ev.clientY;
							ev.dx = cx - ox;
							ev.dy = cy - oy;
							ox = cx;
							oy = cy;
						};

						// h5trackstart実行時に、move、upのハンドラを作成して登録する。
						// コンテキストをとるように関数をラップして、bindする。
						// touchstartで発火したならtouchstart,touchendにバインド、
						// そうでない場合(mousedown)ならmousemove,mousenendにバインド
						var moveEventType = isTouch ? 'touchmove' : 'mousemove';
						var endEventType = isTouch ? 'touchend' : 'mouseup';
						var moveHandler = getHandler(moveEventType, nt, setupDPos);
						var upHandler = getHandler(endEventType, nt);
						var moveHandlerWrapped = function(e) {
							context.event = e;
							context.evArg = handlerArgumentsToContextEvArg(arguments);
							moveHandler(context);
						};
						var upHandlerWrapped = function(e) {
							context.event = e;
							context.evArg = handlerArgumentsToContextEvArg(arguments);
							upHandler(context);
						};

						// タッチならイベントの起きた要素、マウスならdocumentにバインド
						var $bindTarget = isTouch ? $(nt) : $document;
						// moveとendのunbindをする関数
						removeHandlers = function() {
							storedEvents = [];
							h5trackTriggeredFlags = [];
							$bindTarget.unbind(moveEventType, moveHandlerWrapped);
							$bindTarget.unbind(endEventType, upHandlerWrapped);
							if (!isTouch && controller.rootElement !== document) {
								$(controller.rootElement).unbind(moveEventType, moveHandlerWrapped);
								$(controller.rootElement).unbind(endEventType, upHandlerWrapped);
							}
						};
						// h5trackmoveとh5trackendのbindを行う
						$bindTarget.bind(moveEventType, moveHandlerWrapped);
						$bindTarget.bind(endEventType, upHandlerWrapped);

						// タッチでなく、かつコントローラのルートエレメントがdocumentでなかったら、ルートエレメントにもバインドする
						// タッチイベントでない場合、move,endをdocumentにバインドしているが、途中でmousemove,mouseupを
						// stopPropagationされたときに、h5trackイベントを発火することができなくなる。
						// コントローラのルートエレメント外でstopPropagationされていた場合を考慮して、
						// ルートエレメントにもmove,endをバインドする。
						// (ルートエレメントの内側でstopPropagationしている場合は考慮しない)
						// (タッチの場合はターゲットはstart時の要素なので2重にバインドする必要はない)
						if (!isTouch && controller.rootElement !== document) {
							// h5trackmoveとh5trackendのbindを行う
							$(controller.rootElement).bind(moveEventType, moveHandlerWrapped);
							$(controller.rootElement).bind(endEventType, upHandlerWrapped);
						}
					} else if (type === EVENT_NAME_H5_TRACKEND) {
						// touchend,mousup時(=h5trackend時)にmoveとendのイベントをunbindする
						removeHandlers();
						execute = false;
					}
				};
			}
			function createBindObj(en) {
				return {
					controller: controller,
					selector: selector,
					eventName: en,
					handler: getHandler(en)
				};
			}
			var bindObjects = [getNormalBindObj(controller, selector, eventName, func)];
			if (hasTouchEvent) {
				// タッチがあるならタッチにもバインド
				bindObjects.push(createBindObj('touchstart'));
			}
			bindObjects.push(createBindObj('mousedown'));
			return bindObjects;
		}
		return getBindObjects();
	}

	/**
	 * 要素のオフセットを返す
	 *
	 * @private
	 * @param {DOM} target
	 * @returns {Object} offset
	 */
	function getOffset(target) {
		if (target.tagName.toLowerCase() !== 'svg' || isSVGOffsetCollect()) {
			// オフセットを返す
			return $(target).offset();
		}

		// targetがSVG要素で、SVG要素のoffsetが正しくとれないブラウザの場合は自分で計算する issue #393
		var doc = getDocumentOf(target);
		var dummyRect = doc.createElementNS(SVG_XMLNS, 'rect');
		// viewBoxを考慮して、SVG要素の左上位置にrectを置くようにしている
		var viewBox = target.viewBox;
		var x = viewBox.baseVal.x;
		var y = viewBox.baseVal.y;
		dummyRect.setAttribute('x', x);
		dummyRect.setAttribute('y', y);
		dummyRect.setAttribute('width', 1);
		dummyRect.setAttribute('height', 1);
		// transformを空文字にして無効にする(cssで指定されていたとしても無効にして計算できるようにするため)
		clearTransformStyle(dummyRect);

		// ダミー要素を追加してオフセット位置を取得
		target.appendChild(dummyRect);
		var dummyRectOffset = $(dummyRect).offset();
		// ダミー要素を削除
		target.removeChild(dummyRect);

		// 取得したオフセット位置を返す
		return dummyRectOffset;
	}

	/**
	 * タッチイベントのイベントオブジェクトにpageXやoffsetXといった座標系のプロパティを追加します。
	 * <p>
	 * touchstart/touchmove/touchendをjQuery.trigger()で発火させた場合、originalEventプロパティは存在しないので、座標系プロパティのコピーを行いません。
	 * </p>
	 *
	 * @private
	 * @param {Event} event jQuery.Eventオブジェクト
	 * @param {String} eventName イベント名
	 */
	function initTouchEventObject(event, eventName) {
		var originalEvent = event.originalEvent;

		if (!originalEvent) {
			return;
		}

		var touches = eventName === 'touchend' || eventName === 'touchcancel' ? originalEvent.changedTouches[0]
				: originalEvent.touches[0];
		var pageX = touches.pageX;
		var pageY = touches.pageY;
		event.pageX = originalEvent.pageX = pageX;
		event.pageY = originalEvent.pageY = pageY;
		event.screenX = originalEvent.screenX = touches.screenX;
		event.screenY = originalEvent.screenY = touches.screenY;
		event.clientX = originalEvent.clientX = touches.clientX;
		event.clientY = originalEvent.clientY = touches.clientY;

		var target = event.target;
		if (target.ownerSVGElement) {
			target = target.farthestViewportElement;
		} else if (target === window || target === document) {
			target = document.body;
		}
		var offset = getOffset(target);
		var offsetX = pageX - offset.left;
		var offsetY = pageY - offset.top;
		event.offsetX = originalEvent.offsetX = offsetX;
		event.offsetY = originalEvent.offsetY = offsetY;
	}
	/**
	 * イベントオブジェクトを正規化します。
	 *
	 * @private
	 * @param {Object} event jQuery.Eventオブジェクト
	 */
	function normalizeEventObjext(event) {
		// ここはnull, undefinedの場合にtrueとしたいため、あえて厳密等価を使用していない
		if (event && event.offsetX == null && event.offsetY == null && event.pageX && event.pageY) {
			var target = event.target;
			if (target.ownerSVGElement) {
				// SVGに属する図形なら、外側のSVG要素をtargetとして扱う
				target = target.farthestViewportElement;
			} else if (target === window || target === document) {
				target = document.body;
			}
			var offset = getOffset(target);
			event.offsetX = event.pageX - offset.left;
			event.offsetY = event.pageY - offset.top;
		}
	}

	/**
	 * イベントハンドラに渡された、イベントオブジェクト以降の引数を、context.evArgに格納する形に変換します
	 *
	 * <pre>
	 * 例:
	 * $elm.trigger('mouseup', [1, 2, 3]);
	 * なら、イベントハンドラに渡されるイベントは、[event, 1, 2, 3]です。
	 * この[1,2,3]の部分をcontext.evArgに格納してコントローラでバインドしたハンドラに渡す必要があるため、変換が必要になります。
	 * </pre>
	 *
	 * 引数が複数(イベントオブジェクトは除く)ある場合は配列、1つしかない場合はそれをそのまま、無い場合はundefinedを返します。
	 *
	 * @private
	 * @param {argumentsObject} args イベントハンドラに渡されたargumentsオブジェクト
	 * @returns {Any} context.evArgに格納する形式のオブジェクト
	 */
	function handlerArgumentsToContextEvArg(args) {
		// 1番目はイベントオブジェクトが入っているので無視して、2番目以降からをevArgに格納する形にする
		// 格納するものがないならundefined
		// 1つだけあるならそれ
		// 2つ以上あるなら配列を返す

		var evArg;
		if (args.length < 3) {
			// 引数部分が1つ以下ならargs[1]をevArgに格納（引数なしならevArgはundefined)
			evArg = args[1];
		} else {
			// 引数が2つ以上なら配列にしてevArgに格納
			evArg = argsToArray(args).slice(1);
		}
		return evArg;
	}

	/**
	 * イベントコンテキストを作成します。
	 *
	 * @private
	 * @param {Object} bindObj バインドオブジェクト
	 * @param {Array} args 1番目にはjQuery.Eventオブジェクト、2番目はjQuery.triggerに渡した引数
	 * @returns {EventContext}
	 */
	function createEventContext(bindObj, args) {
		var event = null;
		var evArg = null;
		if (args) {
			event = args[0];
			evArg = handlerArgumentsToContextEvArg(args);
		}
		// イベントオブジェクトの正規化
		normalizeEventObjext(event);

		return new EventContext(bindObj.controller, event, evArg, bindObj.evSelector,
				bindObj.evSelectorType);
	}

	/**
	 * 初期化イベントコンテキストをセットアップします。
	 *
	 * @private
	 * @param {Controller} rootController ルートコントローラ
	 * @returns {Object} argsを持つオブジェクト
	 */
	function createInitializationContext(rootController) {
		return {
			args: rootController.__controllerContext.args
		};
	}

	/**
	 * コントローラとその子孫コントローラのrootElementと、view.__controllerにnullをセットします。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 */
	function unbindRootElement(controller) {
		doForEachControllerGroups(controller, function(c) {
			c.rootElement = null;
			c.view.__controller = null;
		});
	}

	/**
	 * コントローラをバインドする対象となる要素を返します。
	 *
	 * @private
	 * @param {String|DOM|jQuery} element セレクタ、DOM要素、もしくはjQueryオブジェクト
	 * @param {Controller} controller バインドするコントローラ
	 * @param {Controller} parentController 親コントローラ
	 * @returns {DOM} コントローラのバインド対象である要素
	 */
	function getBindTarget(element, controller, parentController) {
		if (element == null) {
			throwFwError(ERR_CODE_BIND_TARGET_REQUIRED, [controller.__name]);
		}
		var $targets;
		// elementが文字列でもオブジェクトでもないときはエラー
		if (!isString(element) && typeof element !== 'object') {
			throwFwError(ERR_CODE_BIND_TARGET_ILLEGAL, [controller.__name]);
		}
		if (parentController) {
			// 親コントローラが指定されている場合は、親のコントローラを起点に探索する
			$targets = getTarget(element, parentController);
		} else {
			$targets = $(element);
		}

		// 要素が存在しないときはエラー
		if ($targets.length === 0) {
			throwFwError(ERR_CODE_BIND_NO_TARGET, [controller.__name]);
		}
		// 要素が複数存在するときはエラー
		if ($targets.length > 1) {
			throwFwError(ERR_CODE_BIND_TOO_MANY_TARGET, [controller.__name]);
		}
		return $targets.get(0);
	}

	/**
	 * __readyイベントを実行します
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @returns {Promose}
	 */
	function triggerReady(controller) {
		// コントローラマネージャの管理対象に追加する
		// フレームワークオプションでコントローラマネージャの管理対象としない(managed:false)の場合、コントローラマネージャに登録しない
		var managed = controller.__controllerContext.managed;
		var controllers = controllerManager.controllers;
		if ($.inArray(controller, controllers) === -1 && managed !== false) {
			controllers.push(controller);
		}
		// __readyイベントの実行
		controller.__controllerContext.triggerReadyExecuted = true;
		executeLifecycleEventChain(controller, '__ready');
	}

	/**
	 * __initイベントを実行します
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @param {Boolean} async 同期で__initを呼ぶ場合はfalseを指定
	 */
	function triggerInit(controller, async) {
		if (async === false) {
			// asyncがfalseなら同期
			executeLifecycleEventChain(controller, '__init');
			return;
		}

		// asyncにfalseが指定されていない場合は必ず非同期になるようにする
		setTimeout(
				function() {
					// この時点でcontrollerがルートコントローラでなくなっている(__construct時などバインド後すぐにmanageChildされた)場合がある
					// その場合はmanageChild()した側のルートコントローラのライフサイクルが完全に終わっている(===readyDfd削除まで終わっている)場合、
					// 自分でtriggerInitする必要がある
					// ルートのライフサイクルがまだ終わっていない場合は、親がライフサイクルを実行してくれるのでmanageChildされた側はtriggerInitしない
					if (isUnbinding(controller)
							|| (!controller.__controllerContext.isRoot && controller.rootController.readyDfd)) {
						return;
					}
					executeLifecycleEventChain(controller, '__init');
				}, 0);
	}

	/**
	 * rootController, parentControllerのセットと__postInitイベントを実行します。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 */
	function triggerPostInit(controller) {
		// __postInitイベントの実行
		controller.__controllerContext.triggerPostInitExecuted = true;
		executeLifecycleEventChain(controller, '__postInit');
	}

	/**
	 * h5.core.bindController()のために必要なプロパティをコントローラに追加します。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @param {Object} param 初期化パラメータ
	 */
	function initInternalProperty(controller, param) {
		doForEachControllerGroups(controller, function(c) {
			var templateDfd = getDeferred();
			templateDfd.resolve();
			var context = c.__controllerContext;
			context.templatePromise = templateDfd.promise();
			context.initDfd = getDeferred();
			context.postInitDfd = getDeferred();
			context.readyDfd = getDeferred();
			context.isUnbinding = false;
			context.isUnbinded = false;
			context.isExecutedBind = false;
			context.triggerPostInitExecuted = false;
			context.triggerReadyExecuted = false;
			context.args = param;
			c.initPromise = context.initDfd.promise();
			c.postInitPromise = context.postInitDfd.promise();
			c.readyPromise = context.readyDfd.promise();
			c.isInit = false;
			c.isPostInit = false;
			c.isReady = false;
		});
	}

	/**
	 * インジケータを呼び出します。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @param {Object} option インジケータのオプション
	 * @returns {Indicator}
	 */
	function callIndicator(controller, option) {
		var target = null;
		var opt = option;

		if ($.isPlainObject(opt)) {
			target = opt.target;
		} else {
			opt = {};
		}
		target = target ? getTarget(target, controller) : controller.rootElement;
		return h5.ui.indicator.call(controller, target, opt);
	}

	/**
	 * __unbind, __disposeイベントを実行します。 各コントローラの__unbind,__disposeが返すプロミスを成功かどうか変わらずに待つプロミス
	 *
	 * @private
	 * @param {Controller} controller コントローラ(ルートコントローラ)
	 * @param {String} funcName プロパティ名(__unbind | __dispose)
	 * @returns {Promise[]} Promiseオブジェクト
	 */
	function executeLifeEndChain(controller, funcName) {
		var promises = [];
		var error = null;
		// 深さ優先で__unbind,__disposeの実行
		doForEachControllerGroupsDepthFirst(controller, function(c) {
			if (c[funcName] && isFunction(c[funcName])) {
				try {
					var ret = c[funcName]();
				} catch (e) {
					// エラーが起きても__unbind,__disposeの実行のチェーンは継続させる
					// 最初に起きたエラーを覚えておいて、それ以降に起きたエラーは無視
					error = error || e;
				}
				if (isPromise(ret)) {
					promises.push(ret);
				}
			}
		});
		if (error) {
			// __unbind,__disposeで例外が発生した場合はエラーを投げる
			// (executeLifeEndChainの呼び出し元で拾っている)
			throw error;
		}
		return promises;
	}

	/**
	 * オブジェクトのhasOwnPropertyがtrueのプロパティ全てにnullを代入します。
	 * <p>
	 * ネストしたオブジェクトへのnull代入は行いません
	 * </p>
	 *
	 * @private
	 * @param {Object} obj
	 */
	function nullify(obj) {
		for ( var prop in obj) {
			if (obj.hasOwnProperty(prop)) {
				obj[prop] = null;
			}
		}
	}

	/**
	 * コントローラのリソース解放処理を行います。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @param {Error} e エラーオブジェクト(正常時は無し)。エラーオブジェクトが指定されている場合は、dispose処理後にthrowする。
	 * @param {Object} rejectReason プロミスのfailハンドラに渡すオブジェクト(正常時は無し)
	 * @returns promise(ただしエラーがある場合はdispose処理が終わった後にエラーを投げて終了します)
	 */
	function disposeController(controller, e, rejectReason) {
		// rootControllerの取得
		// rootControllerが設定される前(__construct内からdispose()を呼び出した場合)のことを考慮して、
		// rootControllerを取得する前にisRootを見てtrueならcontrollerをルートコントローラとみなす
		var rootController = controller.__controllerContext
				&& (controller.__controllerContext.isRoot ? controller : controller.rootController);

		if (!rootController) {
			// rootControllerが無い場合、
			// エラーオブジェクトがあればエラーを投げて終了。エラーのない場合は何もしないで終了。
			if (e) {
				// ライフサイクルの中でdispose()して、__unbindや__disposeでエラーが出た時に、
				// ライフサイクル呼び出しを包んでいるtry-catchのcatch節から再度disposeControllerが呼ばれる。
				// その時に、dispose()の呼び出しで起きたエラーを飲まないようにするため、ここで再スローする。
				throw e;
			}
			return;
		}
		if (isDisposing(rootController)) {
			// コントローラのdispose中、dispose済みのコントローラについて呼ばれた場合は何もしない
			return;
		}

		rootController.__controllerContext.isDisposing = 1;

		// unbindの実行
		try {
			unbindController(rootController, rejectReason || e);
		} catch (unbindError) {
			// __unbindの実行でエラーが起きた場合
			// 既に投げるエラーがある場合はここで発生したエラーは飲む(初出のエラーを投げるため)
			// ここで発生したエラーが初出の場合は、ここで起きたエラーを最後に投げる
			// (一番最初に起きた例外のみスローする。変数eには初出のエラーを格納する)
			e = e || unbindError;
		}

		// __disposeを実行してからcleanupする
		// __disposeの実行
		var promises;
		var disposeError = null;
		try {
			promises = executeLifeEndChain(rootController, '__dispose');
		} catch (error) {
			// __disposeの実行でエラーが起きた場合
			// 既に投げるエラーがある場合はそのまま飲むが、そうでない場合はここでキャッチしたエラーを投げる
			// (一番最初に起きた例外のみスロー)
			e = e || error;
			// disposeのエラーがあるかどうか覚えておく
			disposeError = disposeError || error;
		}

		/** disposeメソッド(disposeControllerメソッド)が返すプロミスのdeferred */
		var dfd = rootController.deferred();

		/** __disposeが返すプロミスがrejectされた時のRejectReasonオブジェクト */
		var disposeRejectReason = null;

		/** コントローラのクリーンアップとエラー時の処理 */
		function cleanup() {
			var lifecycleerrorObject = e || rejectReason || disposeError || disposeRejectReason;
			// 子から順にview.clearとnullifyの実行
			doForEachControllerGroupsDepthFirst(rootController, function(c) {
				// viewのclearとnullify
				if (c.view && c.view.__view) {
					// 内部から呼ぶviewのクリアは、アンバインド後に呼ぶので
					// view.clearではなくview.__view.clearを使ってエラーチェックをしないようにする
					c.view.__view.clear();
				}
				if (!lifecycleerrorObject) {
					// エラーが起きていたらnullifyしない(nullifyをしないことでユーザがエラー時の原因を調べやすくなる)
					nullify(c);
				} else {
					// isDisposedフラグを立てる
					// (nullifyされた場合は__controllerContextごと消えるので見えないが、nullifyされない場合にもdisposeが完了したことが分かるようにする)
					c.__controllerContext.isDisposed = 1;
				}
			});

			if (disposeRejectReason) {
				// disposeの返すプロミスをrejectする。
				// 引数にはエラーオブジェクトまたはrejectReasonを渡す
				dfd.rejectWith(rootController, [disposeRejectReason]);
			} else {
				dfd.resolveWith(rootController);
			}
			if (!lifecycleerrorObject) {
				// 何もエラーが起きていなければここで終了
				return;
			}
			// cleanupが終わったタイミングで、エラーまたはrejectされてdisposeされた場合は、"lifecycleerror"イベントをあげる
			// イベントオブジェクトのdetailに(初出の)エラーオブジェクトまたはrejectReasonをいれる
			// __disposeで初めてエラーまたはrejectされた場合は__disposeのエラーまたはrejectReasonを入れる
			triggerLifecycleerror(rootController, lifecycleerrorObject);
			if (e || disposeError) {
				throw e || disposeError;
			}
		}
		function disposeFail() {
			// __disposeで投げられた例外または、promiseがrejectされた場合はそのrejectに渡された引数を、disposeの返すプロミスのfailハンドラに渡す
			disposeRejectReason = disposeError
					|| createRejectReason(ERR_CODE_CONTROLLER_DISPOSE_REJECTED_BY_USER,
							rootController.__name, argsToArray(arguments));
			// コントローラの句リンアップ
			cleanup();
		}

		// __disposeでエラーが起きていたらプロミスを待たずに失敗時の処理を実行
		if (disposeError) {
			disposeFail();
		} else {
			// __disposeの返すプロミスを待機してから句リンアップ処理を実行
			waitForPromises(promises, cleanup, disposeFail, true);
		}
		return dfd.promise();
	}

	/**
	 * コントローラのアンバインド処理を行います。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @param {Object} rejectReason 各Dfdをrejectするときにfailハンドラに渡す引数
	 */
	function unbindController(controller, rejectReason) {
		// 既にunbindされている何もしない
		if (isUnbinding(controller)) {
			return;
		}
		controller.__controllerContext.isUnbinding = 1;

		// rejectまたはfailされていないdeferredをreject()する
		// rejectReasonが指定されている場合はrejectReasonをfailハンドラの引数に渡す
		// rejectReasonは未指定で、エラーオブジェクトが渡されている場合はエラーオブジェクトをfailハンドラの引数に渡す
		// 正常時(rejectReasonもeもない場合)は、引数なし
		rejectControllerDfd(controller, rejectReason);

		// __unbindの実行
		var unbindError;
		try {
			executeLifeEndChain(controller, '__unbind');
		} catch (e) {
			// エラーが起きたら覚えておく
			unbindError = e;
		}

		doForEachControllerGroups(controller, function(c) {
			// unbind時は__metaのuseHandlersによらずunbind(onで動的に追加されるハンドラもあるため)
			unbindEventHandlers(c);
		});

		controller.__controllerContext.unbindList = {};

		// コントローラマネージャの管理対象から外す.
		var controllers = controllerManager.controllers;
		var that = controller;
		controllerManager.controllers = $.grep(controllers, function(controllerInstance) {
			return controllerInstance !== that;
		});
		// h5controllerunboundイベントをトリガ
		// (コントローラのpostInitまで終わっている、かつ、managedがfalseではない(===h5controllerboundをあげている)場合のみ)
		if (controller.isPostInit && controller.__controllerContext.managed !== false) {
			$(controller.rootElement).trigger('h5controllerunbound', controller);
		}

		// rootElementとview.__view.controllerにnullをセット
		unbindRootElement(controller);

		// unbind処理が終了したのでunbindedをtrueにする
		controller.__controllerContext.isUnbinded = 1;

		// __unbindでエラーが投げられていれば再スロー
		if (unbindError) {
			throw unbindError;
		}
	}

	/**
	 * 指定されたIDを持つViewインスタンスを返します。 自身が持つViewインスタンスが指定されたIDを持っていない場合、parentControllerのViewインスタンスに対して
	 * 持っているかどうか問い合わせ、持っていればそのインスタンスを、持っていなければ更に上に問い合わせます。
	 * ルートコントローラのViewインスタンスも持っていない場合、h5.core.viewに格納された最上位のViewインスタンスを返します。
	 *
	 * @private
	 * @param {String} templateId テンプレートID
	 * @param {Controller} controller コントローラ
	 * @returns {View}
	 */
	function getView(templateId, controller) {
		if (controller.view.__view.isAvailable(templateId)) {
			return controller.view.__view;
		} else if (controller.parentController) {
			return getView(templateId, controller.parentController);
		}
		return h5.core.view;
	}

	/**
	 * 指定されたコントローラがdispose済みかどうかを返します
	 * <p>
	 * dispose処理の途中でまだdisposeが完了していない場合はfalseを返します
	 * </p>
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @returns {Boolean}
	 */
	function isDisposed(controller) {
		return !controller.__controllerContext || controller.__controllerContext.isDisposed;
	}

	/**
	 * 指定されたコントローラがdispose処理中またはdispose済みかどうかを返します
	 * <p>
	 * isDisposedと違い、dispose処理の途中でまだdisposeが完了していない場合にtrueを返します
	 * </p>
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @returns {Boolean}
	 */
	function isDisposing(controller) {
		return isDisposed(controller) || controller.__controllerContext.isDisposing;
	}

	/**
	 * 指定されたコントローラがunbind処理中またはunbind済みかどうかを返します
	 * <p>
	 * すでにdisposeされている場合はアンバインド済みなのでtrueを返します
	 * </p>
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @returns {Boolean}
	 */
	function isUnbinding(controller) {
		var rc = controller.__controllerContext && controller.__controllerContext.isRoot ? controller
				: controller.rootController;
		return !rc || isDisposed(rc) || rc.__controllerContext.isUnbinding
				|| rc.__controllerContext.isUnbinded;
	}

	/**
	 * 指定されたコントローラとその子供コントローラのresolve/rejectされていないdeferredをrejectします。
	 *
	 * @private
	 * @param {Controller} controller コントローラ
	 * @param {Any} [errorObj] rejectに渡すオブジェクト
	 */
	function rejectControllerDfd(controller, errorObj) {
		// 指定されたコントローラのルートコントローラを取得
		// ルートからinitDfdをrejectしていく
		var propertyArray = ['postInitDfd', 'readyDfd'];

		// ルートからinitDfd.rejectしていく
		var controllers = [];
		doForEachControllerGroups(controller, function(c) {
			controllers.push(c);
			var dfd = c.__controllerContext['initDfd'];
			if (dfd && !isRejected(dfd) && !isResolved(dfd)) {
				// thisをDfdを持つコントローラにしてreject
				dfd.rejectWith(c, [errorObj]);
			}
		});

		// 子からpostInitDfd, readyDfdをrejectしていく
		for (var i = 0, l = propertyArray.length; i < l; i++) {
			var property = propertyArray[i];
			// initDfdと逆順
			for (var index = controllers.length - 1; index >= 0; index--) {
				var c = controllers[index];
				var dfd = c.__controllerContext[property];
				if (dfd && !isRejected(dfd) && !isResolved(dfd)) {
					// thisをDfdを持つコントローラにしてreject
					dfd.rejectWith(c, [errorObj]);
				}
			}
		}
	}

	/**
	 * インラインコメントテンプレートノードを探す
	 *
	 * @private
	 * @param {Node} rootNode 探索を開始するルートノード
	 * @param {String} id テンプレートID
	 * @returns {Node} 発見したコメントノード、見つからなかった場合はnull
	 */
	function findCommentBindingTarget(rootNode, id) {
		var childNodes = rootNode.childNodes;
		for (var i = 0, len = childNodes.length; i < len; i++) {
			var n = childNodes[i];
			if (n.nodeType === 1) {
				//Magic number: 1はNode.ELEMENT_NODE
				var ret = findCommentBindingTarget(n, id);
				if (ret) {
					//深さ優先で探索して見つかったらそこで探索終了
					return ret;
				}
			} else if (n.nodeType === 8) {
				//Magic Number: 8はNode.COMMENT_NODE
				var nodeValue = n.nodeValue;
				if (nodeValue.indexOf(COMMENT_BINDING_TARGET_MARKER) !== 0) {
					//コメントが開始マーカーで始まっていないので探索継続
					continue;
				}

				var beginTagCloseBracketIdx = nodeValue.indexOf('}');
				if (beginTagCloseBracketIdx === -1) {
					//マーカータグが正しく閉じられていない
					continue;
				}

				var beginTag = nodeValue.slice(0, beginTagCloseBracketIdx);

				var matched = beginTag.match(/id="([A-Za-z][\w-:\.]*)"/);
				if (!matched) {
					//idが正しく記述されていない
					continue;
				} else if (matched[1] === id) {
					//探しているidを持つインラインコメントテンプレートノードが見つかったのでリターン
					return n;
				}
			}
		}
		return null;
	}

	/**
	 * ロジック、コントローラが持つown
	 *
	 * @private
	 * @param {Function} func
	 * @returns funcの実行結果
	 */
	function own(func) {
		var that = this;
		return function(/* var_args */) {
			return func.apply(that, arguments);
		};
	}

	/**
	 * ロジック、コントローラが持つownWithOrg
	 *
	 * @private
	 * @param {Function} func
	 * @returns funcの実行結果
	 */
	function ownWithOrg(func) {
		var that = this;
		return function(/* var_args */) {
			var args = h5.u.obj.argsToArray(arguments);
			args.unshift(this);
			return func.apply(that, args);
		};
	}

	/**
	 * templateDfdにテンプレートのロード待機処理を設定する
	 *
	 * @param {Controller} controller
	 * @param {Deferred} templateDfd
	 * @param {String|String[]|Depency} templates テンプレートのパス(またはその配列)または、Dependencyオブジェクト
	 */
	function setTemlatesDeferred(controller, templateDfd, templates) {
		var controllerName = controller.__name;
		function viewLoad(count) {
			// Viewモジュールがない場合、この直後のloadでエラーが発生してしまうためここでエラーを投げる。
			if (!h5.u.obj.getByPath('h5.core.view')) {
				throwFwError(ERR_CODE_NOT_VIEW);
			}

			templates = isArray(templates) ? templates : [templates];
			var promises = [];
			for (var i = 0, l = templates.length; i < l; i++) {
				// 文字列が指定されていたらDependencyに変換
				var dependency = isDependency(templates[i]) ? templates[i] : h5.res
						.dependsOn(templates[i]);
				promises.push(dependency.resolve('ejsfile'));
			}
			waitForPromises(promises, function(resources) {
				fwLogger.debug(FW_LOG_TEMPLATE_LOADED, controllerName);
				// viewにテンプレートを登録
				resources = isArray(resources) ? resources : [resources];
				for (var i = 0, l = resources.length; i < l; i++) {
					var templates = resources[i].templates;
					for (var j = 0, len = templates.length; j < len; j++) {
						// 内部から呼ぶviewのロードは、ルートコントローラ設定前に呼ぶので、
						// viewではなくview.__viewを使ってコントローラのルートエレメントが設定されているかのチェックをしないようにする
						try {
							controller.view.__view.register(templates[j].id, templates[j].content);
						} catch (e) {
							// registerで登録できない(=コンパイルエラー)ならreject
							templateDfd.reject(e);
						}
					}
				}
				templateDfd.resolve();
			}, function(result) {
				// テンプレートのロードをリトライする条件は、リトライ回数が上限回数未満、かつ
				// jqXhr.statusが0、もしくは12029(ERROR_INTERNET_CANNOT_CONNECT)であること。
				// jqXhr.statusの値の根拠は、IE以外のブラウザだと通信エラーの時に0になっていること、
				// IEの場合は、コネクションが繋がらない時のコードが12029であること。
				// 12000番台すべてをリトライ対象としていないのは、何度リトライしても成功しないエラーが含まれていることが理由。
				// WinInet のエラーコード(12001 - 12156):
				// http://support.microsoft.com/kb/193625/ja
				var jqXhrStatus = result.detail.error.status;
				if (count === h5.settings.dynamicLoading.retryCount || jqXhrStatus !== 0
						&& jqXhrStatus !== ERROR_INTERNET_CANNOT_CONNECT) {
					fwLogger.error(FW_LOG_TEMPLATE_LOAD_FAILED, controllerName, result.detail.url);
					setTimeout(function() {
						templateDfd.reject(result);
					}, 0);
					return;
				}
				setTimeout(function() {
					viewLoad(++count);
				}, h5.settings.dynamicLoading.retryInterval);
			});
		}
		viewLoad(0);
	}

	/**
	 * eventHandlerInfoオブジェクトを作成します
	 * <p>
	 * 第4引数propはコントローラ定義に書かれたイベントハンドラ(静的)ならそのプロパティ名を渡してください
	 * </p>
	 * <p>
	 * 動的なイベントハンドラの場合はpropは指定しないでください
	 * </p>
	 *
	 * @param {String|Object} selector
	 * @param {String} eventName
	 * @param {Controller|Object} controller コントローラまたはコントローラ定義オブジェクト
	 * @param {String} prop コントローラ定義に記述された静的イベントハンドラの場合に、そのインベントハンドラのプロパティを指定
	 * @returns {Object} eventHandlerInfo
	 */
	function createEventHandlerInfo(selector, eventName, controller, prop) {
		// selectorが文字列じゃない場合はターゲットを直接指定している
		var isSelector = isString(selector);
		var bindTarget = isSelector ? null : selector;

		selector = isSelector ? $.trim(selector) : null;
		eventName = $.trim(eventName);

		// ターゲットが直接指定されているならisGlobalはtrue
		var isGlobal = !isSelector || isGlobalSelector(selector);
		var isBindRequested = isBindRequestedEvent(eventName);
		if (isBindRequested) {
			eventName = $.trim(trimBindEventBracket(eventName));
		}

		if (isSelector && isGlobal) {
			var selector = trimGlobalSelectorBracket(selector);
			// selectorに{this}が指定されていたらエラー
			if (selector === 'this') {
				throwFwError(ERR_CODE_EVENT_HANDLER_SELECTOR_THIS, [controller.__name], {
					controllerDef: controller
				});
			}
		}

		return {
			selector: selector,
			bindTarget: bindTarget,
			isGlobal: isGlobal,
			isBindRequested: isBindRequested,
			eventName: eventName,
			propertyKey: prop
		};
	}

	/**
	 * コントローラキャッシュエントリークラス
	 *
	 * @private
	 * @name ControllerCacheEntry
	 * @class
	 */
	function ControllerCacheEntry() {
		// ロジックのプロパティ
		this.logicProperties = [];
		// イベントハンドランプロパティ
		this.eventHandlerProperties = [];
		// 関数のプロパティ
		this.functionProperties = [];
		// その他、コントローラインスタンスに持たせるプロパティ
		this.otherProperties = [];
		// バインドマップ
		this.bindMap = {};
		// 子コントローラのプロパティ
		this.childControllerProperties = [];
	}

	/**
	 * コントローラのキャッシュを作成する
	 *
	 * @private
	 * @param {Object} controllerDef コントローラ定義オブジェクト
	 * @returns コントローラのキャッシュオブジェクト
	 */
	function createControllerCache(controllerDef) {
		var cache = new ControllerCacheEntry();
		var logicProperties = cache.logicProperties;
		var eventHandlerProperties = cache.eventHandlerProperties;
		var functionProperties = cache.functionProperties;
		var otherProperties = cache.otherProperties;
		var bindMap = cache.bindMap;
		var childControllerProperties = cache.childControllerProperties;

		// 同じセレクタかつ同じイベントに複数のハンドラが指定されているかをチェックするためのマップ
		var checkBindMap = {};

		for ( var prop in controllerDef) {
			if (isEventHandler(controllerDef, prop)) {
				// イベントハンドラのキー
				eventHandlerProperties.push(prop);
				// イベントハンドラの場合
				// bindMapの作成
				var propTrimmed = $.trim(prop);
				var lastIndex = propTrimmed.lastIndexOf(' ');

				// イベントハンドラインフォの作成
				var info = createEventHandlerInfo(propTrimmed.substring(0, lastIndex), propTrimmed
						.substring(lastIndex + 1, propTrimmed.length), controllerDef, prop);

				// 整形したものを取得
				var selector = info.selector;
				var eventName = info.eventName;
				var isGlobal = info.isGlobal;
				var isBindRequested = info.isBindRequested;

				// 同じセレクタ、同じイベントハンドラに同じ指定(isGlobal,isBindRequested)でイベントハンドラが指定されていたらエラー
				if (!checkBindMap[selector]) {
					checkBindMap[selector] = {};
				}
				if (!checkBindMap[selector][eventName]) {
					checkBindMap[selector][eventName] = {};
				}
				if (!checkBindMap[selector][eventName][isGlobal]) {
					checkBindMap[selector][eventName][isGlobal] = {};
				}
				if (checkBindMap[selector][eventName][isGlobal][isBindRequested]) {
					throwFwError(ERR_CODE_SAME_EVENT_HANDLER, [controllerDef.__name, selector,
							eventName], {
						controllerDef: controllerDef
					});
				} else {
					// フラグを立てる
					checkBindMap[selector][eventName][isGlobal][isBindRequested] = 1;
				}

				bindMap[prop] = info;
			} else if (endsWith(prop, SUFFIX_CONTROLLER) && controllerDef[prop]
					&& !isFunction(controllerDef[prop])) {
				// 子コントローラ
				childControllerProperties.push(prop);
			} else if (endsWith(prop, SUFFIX_LOGIC) && controllerDef[prop]
					&& !isFunction(controllerDef[prop])) {
				// ロジック
				logicProperties.push(prop);
			} else if (isFunction(controllerDef[prop])) {
				// メソッド(ライフサイクル含む)
				functionProperties.push(prop);
			} else {
				// その他プロパティ
				otherProperties.push(prop);
			}
		}
		return cache;
	}

	/**
	 * ロジックキャッシュエントリークラス
	 *
	 * @private
	 * @name LogicCacheEntry
	 * @class
	 */
	function LogicCacheEntry() {
		// ロジックのプロパティ(子ロジック)
		this.logicProperties = [];
		// 関数のプロパティ
		this.functionProperties = [];
	}

	/**
	 * ロジックのキャッシュを作成する
	 *
	 * @private
	 * @param {Object} logicDef ロジック定義オブジェクト
	 * @returns ロジックのキャッシュオブジェクト
	 */
	function createLogicCache(logicDef) {
		var cache = new LogicCacheEntry();
		var functionProperties = cache.functionProperties;
		var logicProperties = cache.logicProperties;
		for ( var p in logicDef) {
			if (isChildLogic(logicDef, p)) {
				logicProperties.push(p);
			} else if (isFunction(logicDef[p])) {
				functionProperties.push(p);
			}
		}
		return cache;
	}

	/**
	 * ロジックの__readyを実行する
	 *
	 * @private
	 * @param {Logic} rootLogic ルートロジック
	 * @param {Deferred} readyDfd rootLogicの__readyが終わったらresolveするdeferred
	 */
	function triggerLogicReady(rootLogic, readyDfd) {
		// 待機中のプロミスを覚えておく
		// プロミスがresolveされたら取り除く
		var waitingPromises = [];

		/**
		 * promiseにdoneハンドラを追加する関数
		 * <p>
		 * ただし、同一プロミスに同一ロジックについてのリスナを登録できないようにしています
		 * </p>
		 *
		 * @param {Promise} promise
		 * @param {Logic} targetLogic
		 * @param {Function} listener
		 */
		function addDoneListener(promise, targetLogic, listener) {
			var logicWaitingPromises = targetLogic.__logicContext.waitingPromises = targetLogic.__logicContext.waitingPromises
					|| [];
			if ($.inArray(promise, logicWaitingPromises) === -1) {
				logicWaitingPromises.push(promise);
				promise.done(listener);
			}
		}

		function execInner(logic, parent) {
			// isReadyは__ready終了(promiseならresolveした)タイミングでtrueになる
			logic.__logicContext.isReady = false;
			// isCalledReadyは__readyを呼んだ(promiseを返すかどうかは関係ない)タイミングでtrueになる
			logic.__logicContext.isCalledReady = false;
			// 深さ優先でexecInnerを実行
			doForEachLogics(logic, execInner);

			/**
			 * 子が全てisReadyなら__readyを実行して自身をisReadyにする
			 */
			function executeReady() {
				if (logic.__logicContext.isCalledReady) {
					// 既に__ready呼び出し済みなら何もしない
					return;
				}
				var isChildrenReady = true;
				doForEachLogics(logic, function(child) {
					// isReadyがfalseなものが一つでもあればfalseを返して探索を終了
					// 子がいない場合はisChidrenReadyはtrueのまま
					isChildrenReady = child.__logicContext.isReady;
					return isChildrenReady;
				});
				if (isChildrenReady) {
					// __readyを実行
					var ret = isFunction(logic.__ready) && logic.__ready();
					logic.__logicContext.isCalledReady = true;
					if (isPromise(ret)) {
						// __readyが返したプロミスをwaitingPromisesに覚えておく
						waitingPromises.push(ret);
						ret.done(function() {
							// __readyが返したプロミスがresolveされたらisReady=trueにする
							logic.__logicContext.isReady = true;
							// waitingPromisesから、resolveしたプロミスを取り除く
							waitingPromises.splice($.inArray(ret, waitingPromises), 1);
							// ロジックが覚えていた、待機しているプロミスはもう不要なので削除
							logic.__logicContext.waitingPromises = null;
							if (logic === rootLogic) {
								// rootLogicのisReadyがtrueになったらreadyDfdをresolveして終了
								readyDfd.resolveWith(logic);
								return;
							}
						});
					} else {
						// __readyが同期または関数でないならすぐにisReadyをtrueにする
						logic.__logicContext.isReady = true;
						// ロジックが覚えていた、待機しているプロミスはもう不要なので削除
						logic.__logicContext.waitingPromises = null;
						if (logic === rootLogic) {
							// rootLogicの__readyが終わったタイミングでreadyDfdをresolveする
							readyDfd.resolveWith(logic);
						}
					}
				} else {
					// 子のいずれかがisReadyじゃない===どこかで待機しているプロミスがある
					// (待機するプロミスが無ければ子から順に実行しているため)
					// この時点で待機しているプロミスのいずれかが完了したタイミングで、
					// 再度自分の子が全てisReadyかどうかをチェックする
					for (var i = 0, l = waitingPromises.length; i < l; i++) {
						// addDoneListener(内部関数)を使って、同じプロミスに同じロジックについてのハンドラが重複しないようにしている
						addDoneListener(waitingPromises[i], logic, executeReady);
					}
				}
			}
			executeReady();
		}
		execInner(rootLogic);
	}

	/**
	 * bindTargetターゲットが同じかどうか判定する
	 * <p>
	 * どちらかがjQueryオブジェクトならその中身を比較
	 * </p>
	 *
	 * @private
	 */
	function isSameBindTarget(target1, target2) {
		if (target1 === target2) {
			// 同一インスタンスならtrue
			return true;
		}
		var isT1Jquery = isJQueryObject(target1);
		var isT2Jquery = isJQueryObject(target2);
		if (!isT1Jquery && !isT2Jquery) {
			// どちらもjQueryオブジェクトでないならfalse;
			return false;
		}
		// どちらかがjQueryオブジェクトなら配列にして比較
		var t1Ary = isT1Jquery ? target1.toArray() : [target1];
		var t2Ary = isT2Jquery ? target2.toArray() : [target2];
		if (t1Ary.length !== t2Ary.length) {
			// 長さが違うならfalse
			return false;
		}
		for (var i = 0, l = t1Ary.length; i < l; i++) {
			if (t1Ary[i] !== t2Ary[i]) {
				return false;
			}
		}
		return true;
	}

	/**
	 * コントローラをエラー終了状態にして、lifecycleerrorイベントをトリガする
	 *
	 * @param {Controller} rootController ルートコントローラ
	 * @param {Error||rejectReason} detail 例外オブジェクト、またはRejectReason
	 */
	function triggerLifecycleerror(rootController, detail) {
		controllerManager.dispatchEvent({
			type: 'lifecycleerror',
			detail: detail,
			rootController: rootController
		});
	}

	/**
	 * 渡されたコントローラにルートエレメントが設定されていなかったらエラーを投げる
	 * <p>
	 * unbindされたコントローラ及び__construct時に呼べないメソッドの先頭で呼び出して使用する
	 * </p>
	 *
	 * @param {Controller} controller
	 * @param {String} method メソッド名
	 */
	function throwErrorIfNoRootElement(controller, method) {
		if (!controller || !controller.rootElement) {
			throwFwError(ERR_CODE_METHOD_OF_NO_ROOTELEMENT_CONTROLLER, method);
		}
	}

	/**
	 * 渡されたコントローラがdisposeされていたら、第２引数に指定されたメソッド名を含めたエラーを投げる
	 * <p>
	 * disposeされたコントローラで呼べないメソッドの先頭で呼び出して使用する
	 * </p>
	 *
	 * @param {Controller} controller
	 * @param {String} method メソッド名
	 */
	function throwErrorIfDisposed(controller, method) {
		if (!controller || isDisposed(controller)) {
			throwFwError(ERR_CODE_METHOD_OF_DISPOSED_CONTROLLER, method);
		}
	}

	/**
	 * イベントのバインドを行う
	 * <p>
	 * bindTargetがnodeならjQueryのbindで、そうでないならaddEventListenerを使ってバインドする。addEventListenerでバインドした場合はbindObj.isNativeBindをtrueにする。
	 * </p>
	 *
	 * @private
	 * @param bindObj バインドオブジェクト
	 */
	function bindEvent(bindObj) {
		var bindTarget = bindObj.bindTarget;
		var eventName = bindObj.eventName;
		var handler = bindObj.handler;
		if (bindTarget && typeof bindTarget.nodeType !== TYPE_OF_UNDEFINED
				|| isWindowObject(bindTarget) || isJQueryObject(bindTarget)) {
			// ノードタイプが定義されている(=ノード)またはwindowオブジェクトの場合またはjQueryオブジェクトの場合はjQueryのbindを使う
			$(bindTarget).bind(eventName, handler);
		} else {
			/* del begin */
			if (bindTarget == null) {
				fwLogger.warn(FW_LOG_BIND_TARGET_NOT_FOUND, bindObj.selector);
			} else if (!bindTarget.addEventListener) {
				fwLogger.warn(FW_LOG_BIND_TARGET_INVALID, bindObj.selector);
			}
			/* del end */
			if (!bindTarget || !bindTarget.addEventListener) {
				bindObj.isBindCanceled = true;
				return;
			}
			// ノードでない場合はaddEventListenerを使う
			bindTarget.addEventListener(eventName, handler);
			bindObj.isNativeBind = true;
		}
	}

	/**
	 * イベントのアンバインドを行う
	 * <p>
	 * bindTargetがnodeならjQueryのunbindで、そうでないならremoveEventListenerを使ってアンバインドする
	 * </p>
	 *
	 * @private
	 * @param bindObj バインドオブジェクト
	 */
	function unbindEvent(bindObj) {
		var bindTarget = bindObj.bindTarget;
		var eventName = bindObj.eventName;
		var handler = bindObj.handler;
		var isNativeBind = bindObj.isNativeBind;
		if (isNativeBind) {
			// addEventListenerでバインドした場合はremoveEventListenerを使う
			bindTarget.removeEventListener(eventName, handler);
		} else {
			$(bindTarget).unbind(eventName, handler);
		}
	}

	/**
	 * コントローラインスタンスを子コントローラとして追加
	 *
	 * @param {Controller} parent
	 * @param {Controller} child
	 */
	function addChildController(parent, child) {
		child.parentController = parent;
		parent.__controllerContext.childControllers.push(child);
		child.__controllerContext.isRoot = false;
		if (parent.__controllerContext.isExecutedConstruct) {
			var rootController = parent.rootController;
			// __construct実行済みならrootControllerを設定
			// 子コントローラの持つ子コントローラも含めてルートコントローラを設定
			doForEachControllerGroups(child, function(c) {
				c.rootController = rootController;
			});
		}
	}

	/**
	 * コントローラインスタンスを子コントローラから削除
	 *
	 * @param {Controller} parent
	 * @param {Controller} child
	 */
	function removeChildController(parent, child) {
		// 子コントローラをルートコントローラにする(親との関係を切る)
		child.parentController = null;
		child.rootController = child;
		child.__controllerContext.isRoot = true;

		var childControllers = parent.__controllerContext.childControllers;
		var index = $.inArray(child, childControllers);
		if (index !== -1) {
			childControllers.splice(index, 1);
		}
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	function controllerFactory(controller, rootElement, controllerName, controllerDef, param,
			isRoot) {

		/**
		 * コントローラ名.
		 *
		 * @type String
		 * @name __name
		 * @memberOf Controller
		 */
		controller.__name = controllerName;

		/**
		 * テンプレート.
		 *
		 * @type String|String[]
		 * @name __templates
		 * @memberOf Controller
		 */
		controller.__templates = null;

		/**
		 * コントローラがバインドされた要素.
		 *
		 * @type Element
		 * @name rootElement
		 * @memberOf Controller
		 */
		controller.rootElement = rootElement;

		/**
		 * コントローラコンテキスト.
		 *
		 * @private
		 * @memberOf Controller
		 * @name __controllerContext
		 */
		controller.__controllerContext = {

			/**
			 * リスナーを実行するかどうかのフラグ
			 *
			 * @type Boolean
			 */
			executeListeners: true,

			/**
			 * ルートコントローラかどうか
			 *
			 * @type Boolean
			 */
			isRoot: isRoot,

			/**
			 * アンバインド対象となるイベントハンドラのマップ.
			 *
			 * @type Object
			 */
			boundHandlers: [],

			/**
			 * コントローラ定義オブジェクト
			 *
			 * @type {Object}
			 */
			controllerDef: controllerDef
		};

		// 初期化パラメータをセット（クローンはしない #163）
		controller.__controllerContext.args = param ? param : null;

		/**
		 * コントローラのライフサイクルイベント__initが終了したかどうかを返します。
		 *
		 * @type Boolean
		 * @memberOf Controller
		 * @name isInit
		 */
		controller.isInit = false;

		/**
		 * コントローラのライフサイクルイベント__postInitが終了したかどうかを返します。
		 *
		 * @type Boolean
		 * @memberOf Controller
		 * @name isPostInit
		 */
		controller.isPostInit = false;

		/**
		 * コントローラのライフサイクルイベント__readyが終了したかどうかを返します。
		 *
		 * @type Boolean
		 * @memberOf Controller
		 * @name isReady
		 */
		controller.isReady = false;

		/**
		 * 親子関係を持つコントローラ群の一番祖先であるコントローラを返します。祖先がいない場合、自分自身を返します。
		 *
		 * @type Controller
		 * @memberOf Controller
		 * @name rootController
		 */
		controller.rootController = null;

		/**
		 * 親子関係を持つコントローラの親コントローラを返します。親コントローラがいない場合、nullを返します。
		 *
		 * @type Controller
		 * @memberOf Controller
		 * @name parentController
		 */
		controller.parentController = null;

		/**
		 * __templatesに指定したテンプレートファイルの読み込みに、成功または失敗したかの状態を持つPromiseオブジェクト。
		 * このオブジェクトが持つ以下の関数で、状態をチェックすることができます。
		 * <p>
		 * <b>state()</b> <table border="1">
		 * <tr>
		 * <td>戻り値</td>
		 * <td>結果</td>
		 * </tr>
		 * <tr>
		 * <td>"resolved"</td>
		 * <td>読み込みに成功</td>
		 * </tr>
		 * <tr>
		 * <td>"rejected"</td>
		 * <td>読み込みに失敗</td>
		 * </tr>
		 * <tr>
		 * <td>"pending"</td>
		 * <td>読み込みが開始されていないまたは読み込み中</td>
		 * </tr>
		 * </table> 注意: jQuery1.7.x未満の場合、この関数は使用できません。
		 * <p>
		 * <b>isResolved(), isRejected()</b> <table border="1">
		 * <tr>
		 * <td>isResolved()の戻り値</td>
		 * <td>isRejected()の戻り値</td>
		 * <td>結果</td>
		 * </tr>
		 * <tr>
		 * <td>true</td>
		 * <td>false</td>
		 * <td>読み込みに成功</td>
		 * </tr>
		 * <tr>
		 * <td>false</td>
		 * <td>true</td>
		 * <td>読み込みに失敗</td>
		 * </tr>
		 * <tr>
		 * <td>false</td>
		 * <td>false</td>
		 * <td>読み込みが開始されていないまたは読み込み中</td>
		 * </tr>
		 * </table>
		 * <p>
		 * また、preInitPromise.done()に関数を設定すると読み込み成功時に、
		 * preInitPromise.fail()に関数を設定すると読み込み失敗時に、設定した関数を実行します。
		 *
		 * @type Promise
		 * @memberOf Controller
		 * @name preInitPromise
		 */
		controller.preInitPromise = null;

		/**
		 * コントローラのライフサイクルイベント__initについてのPromiseオブジェクトを返します。
		 *
		 * @type Promise
		 * @memberOf Controller
		 * @name initPromise
		 */
		controller.initPromise = null;

		/**
		 * コントローラのライフサイクルイベント__postInitについてのPromiseオブジェクトを返します。
		 *
		 * @type Promise
		 * @memberOf Controller
		 * @name postInitPromise
		 */
		controller.postInitPromise = null;

		/**
		 * コントローラのライフサイクルイベント__readyについてのPromiseオブジェクトを返します。
		 *
		 * @type Promise
		 * @memberOf Controller
		 * @name readyPromise
		 */
		controller.readyPromise = null;

		/**
		 * コントローラのロガーを返します。
		 * <p>
		 * コントローラ内のメソッドで<code>this.log.debug('debug message');</code>のように記述して使用します。ロガーの使い方の詳細は<a
		 * href="Log.html">Log</a>をご覧ください。
		 * </p>
		 *
		 * @type Log
		 * @memberOf Controller
		 * @name log
		 */
		controller.log = h5.log.createLogger(controllerName);

		/**
		 * ビュー操作に関するメソッドを格納しています。
		 * <p>
		 * <a href="View.html">View</a>クラスと同様にテンプレートを扱うクラスですが、Controllerの持つViewは以下の点でViewクラスとは異なります。
		 * </p>
		 * <ul>
		 * <li>append/update/prependメソッドでのターゲット(出力先)について、
		 * コントローラのイベントハンドラと同様にコントローラのルートエレメントを起点に選択します。 また、グローバルセレクタも使用可能です。 </li>
		 *
		 * <pre><code>
		 * // 例
		 * // thisはコントローラ
		 * this.view.append('.target', 'tmpId'); // コントローラのルートエレメント内のtargetクラス要素
		 * this.view.append('{.target}', 'tmpId'); // $('.target')と同じ
		 * this.view.append('{rootElement}', 'tmpId'); // コントローラのルートエレメント(this.rootElementと同じ)
		 * this.view.append('{document.body}', 'tmpId'); // body要素
		 * </code></pre>
		 *
		 * <li>指定されたIDのテンプレートの探索を、親コントローラのView、h5.core.viewについても行います。</li>
		 * <li>自分のコントローラ、親コントローラ、親コントローラの親コントローラ、…、ルートコントローラ、h5.core.view、の順番に探索して、
		 * 最初に見つかったテンプレートを返します。</li>
		 *
		 * <pre><code>
		 * // 例
		 * // parentControllerは子コントローラを持つコントローラ
		 * var parent = parentController.view;
		 * var child = parentController.childController;
		 * // viewにテンプレートを登録
		 * h5.core.view.register('a', 'a_coreView');
		 * h5.core.view.register('b', 'b_coreView');
		 * parent.view.register('a', 'a_parent');
		 * parent.view.register('d', 'd_parent');
		 * child.view.register('c', 'c_child');
		 * child.get('c'); // c_child
		 * child.get('d'); // d_parent
		 * child.get('a'); // a_parent
		 * child.get('b'); // b_coreView
		 * </code></pre>
		 *
		 * <li>bindメソッドはコメントビューを使用したバインドが可能です。</li>
		 * <p>
		 * コメントビューの詳細については、<a
		 * href="http://www.htmlhifive.com/conts/web/view/reference/inline-comment-templating">リファレンス（仕様詳細)
		 * &gt;&gt; コメントビュー</a>をご覧ください。
		 * </p>
		 * </ul>
		 *
		 * @name view
		 * @memberOf Controller
		 * @type View
		 * @see View
		 */
		controller.view = new View(controller);
	}

	function View(controller) {
		// 利便性のために循環参照になってしまうがコントローラの参照を持つ
		this.__controller = controller;
		// Viewモジュールがなければインスタンスを作成しない(できない)
		if (h5.u.obj.getByPath('h5.core.view')) {
			this.__view = h5.core.view.createView();
		}
	}

	/**
	 * コメントビューへのバインドに対応したbind
	 * <p>
	 * コメントビューへのバインドはコントローラビューのbindのみでの機能です
	 * </p>
	 *
	 * @private
	 * @param element
	 * @param context
	 * @returns {Binding}
	 */
	// JSDTのフォーマッタが過剰にインデントしてしまうので、独立した関数として記述している
	function View_bind(element, context) {
		throwErrorIfNoRootElement(this.__controller, 'view#bind');
		var target = element;

		if (isString(element) && element.indexOf('h5view#') === 0) {
			//先頭が"h5view#"で始まっている場合、インラインコメントテンプレートへのバインドとみなす
			//（「{h5view id="xxx"}」という記法なので、h5viewタグの特定idをセレクトしているようにみなせる）
			//Magic number: 7は"h5view#"の文字数
			var inlineCommentNode = findCommentBindingTarget(this.__controller.rootElement, element
					.slice(7));

			var rawTmpl = inlineCommentNode.nodeValue;
			var tmpl = rawTmpl.slice(rawTmpl.indexOf('}') + 1);

			//jQueryによる"クリーンな"DOM生成のため、innerHTMLではなくappend()を使う
			var $dummyRoot = $('<div>').append(tmpl);

			target = [];
			var childNodes = $dummyRoot[0].childNodes;
			for (var i = 0, len = childNodes.length; i < len; i++) {
				target.push(childNodes[i]);
			}

			//ダミールートから要素を外し、インラインテンプレートの直後に要素を挿入
			$dummyRoot.empty();
			var fragment = document.createDocumentFragment();
			for (var i = 0, len = target.length; i < len; i++) {
				fragment.appendChild(target[i]);
			}

			inlineCommentNode.parentNode.insertBefore(fragment, inlineCommentNode.nextSibling);
		}

		//詳細な引数チェックはView.bindで行う
		return this.__view.bind(target, context);
	}

	// オリジナルのviewを拡張
	// コントローラのルートエレメントが必須なものは、ルートエレメントがあるかどうかチェック(ないならエラー)
	// またコントローラがdisposeされている(this.__controllerがnullの場合も含む)ならエラー
	$.extend(View.prototype, {
		get: function(templateId, param) {
			throwErrorIfNoRootElement(this.__controller, 'view#get');
			return getView(templateId, this.__controller).get(templateId, param);
		},

		update: function(element, templateId, param) {
			throwErrorIfNoRootElement(this.__controller, 'view#update');
			var target = getTarget(element, this.__controller);
			return getView(templateId, this.__controller).update(target, templateId, param);
		},

		append: function(element, templateId, param) {
			throwErrorIfNoRootElement(this.__controller, 'view#append');
			var target = getTarget(element, this.__controller);
			return getView(templateId, this.__controller).append(target, templateId, param);
		},

		prepend: function(element, templateId, param) {
			throwErrorIfNoRootElement(this.__controller, 'view#prepend');
			var target = getTarget(element, this.__controller);
			return getView(templateId, this.__controller).prepend(target, templateId, param);
		},

		load: function(resourcePaths) {
			throwErrorIfNoRootElement(this.__controller, 'view#load');
			return this.__view.load(resourcePaths);
		},

		register: function(templateId, templateString) {
			throwErrorIfNoRootElement(this.__controller, 'view#register');
			this.__view.register(templateId, templateString);
		},

		isValid: function(templateString) {
			throwErrorIfNoRootElement(this.__controller, 'view#isValid');
			return this.__view.isValid(templateString);
		},

		isAvailable: function(templateId) {
			throwErrorIfNoRootElement(this.__controller, 'view#isAvailable');
			return getView(templateId, this.__controller).isAvailable(templateId);
		},

		clear: function(templateIds) {
			throwErrorIfNoRootElement(this.__controller, 'view#clear');
			this.__view.clear(templateIds);
		},

		getAvailableTemplates: function() {
			throwErrorIfNoRootElement(this.__controller, 'view#getAvailableTemplates');
			return this.__view.getAvailableTemplates();
		},

		bind: View_bind
	});

	/**
	 * コントローラのコンストラクタ
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。 コントローラ化して動作させる場合は<a
	 * href="h5.core.html#controller">h5.core.controller()</a>を使用してください。
	 * </p>
	 *
	 * @name Controller
	 * @class
	 */
	/**
	 * @private
	 * @param {Document} doc コントローラをバインドした要素が属するdocumentノード
	 * @param {Element} rootElement コントローラをバインドした要素
	 * @param {String} controllerName コントローラ名
	 * @param {Object} controllerDef コントローラ定義オブジェクト
	 * @param {Object} param 初期化パラメータ
	 * @param {Boolean} isRoot ルートコントローラかどうか
	 */
	function Controller(rootElement, controllerName, controllerDef, param, isRoot) {
		// フック関数を実行
		for (var i = 0, l = controllerInstantiationHooks.length; i < l; i++) {
			controllerInstantiationHooks[i](this);
		}
		return controllerFactory(this, rootElement, controllerName, controllerDef, param, isRoot);
	}
	$
			.extend(
					Controller.prototype,
					{
						/**
						 * コントローラがバインドされた要素内から要素を選択します。
						 *
						 * @param {String} selector セレクタ
						 * @returns {jQuery} セレクタにマッチするjQueryオブジェクト
						 * @memberOf Controller
						 */
						$find: function(selector) {
							throwErrorIfDisposed(this, '$find');
							throwErrorIfNoRootElement(this, '$find');
							return $(this.rootElement).find(selector);
						},

						/**
						 * Deferredオブジェクトを返します。
						 *
						 * @returns {Deferred} Deferredオブジェクト
						 * @memberOf Controller
						 */
						deferred: function() {
							throwErrorIfDisposed(this, 'deferred');
							return getDeferred();
						},

						/**
						 * ルート要素を起点に指定されたイベントを実行します。
						 * <p>
						 * 第2引数に指定したparameterオブジェクトは、コントローラのイベントハンドラで受け取るcontext.evArgに格納されます。
						 * </p>
						 * <p>
						 * parameterに配列を指定した場合は、context.evArgに渡した配列が格納されます。
						 * </p>
						 * <p>
						 * 戻り値は、jQueryEventオブジェクトを返します。
						 * </p>
						 * <h5>長さ1の配列をparameterに指定した場合について</h5>
						 * <p>
						 *
						 * <pre class="sh_javascript"><code>
						 * trigger('click', ['a']);
						 * </code></pre>
						 *
						 * のように、１要素だけの配列を渡した場合は、配列ではなくその中身がcontext.evArgに格納されます。(jQuery.triggerと同様です。)
						 * </p>
						 * <p>
						 * triggerで、渡した配列の長さに関わらず、渡したデータを配列としてハンドラで扱いたい場合は、以下のような方法を検討してください。。
						 * </p>
						 * <ul>
						 * <li> parameterをオブジェクトでラップする。
						 *
						 * <pre class="sh_javascript"><code>
						 * // trigger
						 * this.trigger('hoge', {data: ary});
						 * // イベントハンドラ
						 * '{rootElement} hoge': function(context){
						 *   var ary = context.evArg.data;
						 *   for(var i = 0, l = ary.length; i &lt; l; i++){
						 *     // 配列に対する処理
						 *   }
						 * }
						 * </code></pre>
						 *
						 * </li>
						 * <li>イベントハンドラ側で、受け取ったデータが配列でなかったら配列でラップしてから扱う
						 *
						 * <pre class="sh_javascript"><code>
						 * // trigger
						 * this.trigger('hoge', ary);
						 * // イベントハンドラ
						 * '{rootElement} hoge': function(context){
						 *   var ary = $.isArray(context.evArg) ? context.evArg: [context.evArg];
						 *   for(var i = 0, l = ary.length; i &lt; l; i++){
						 *     // 配列に対する処理
						 *   }
						 * }
						 * </code></pre>
						 *
						 * </li>
						 * </ul>
						 *
						 * @param {String|jQueryEvent} event イベント名またはjQueryEventオブジェクト
						 * @param {Object} [parameter] パラメータ
						 * @returns {jQueryEvent} event イベントオブジェクト
						 * @memberOf Controller
						 */
						trigger: function(event, parameter) {
							throwErrorIfDisposed(this, 'trigger');
							throwErrorIfNoRootElement(this, 'trigger');
							// eventNameが文字列ならイベントを作って投げる
							// オブジェクトの場合はそのまま渡す。
							var ev = isString(event) ? $.Event(event) : event;
							$(this.rootElement).trigger(ev, parameter);
							return ev;
						},

						/**
						 * 指定された関数に対して、コンテキスト(this)をコントローラに変更して実行する関数を返します。
						 *
						 * @param {Function} func 関数
						 * @return {Function} コンテキスト(this)をコントローラに変更した関数
						 * @memberOf Controller
						 */
						own: function(/* var_args */) {
							throwErrorIfDisposed(this, 'own');
							return own.apply(this, argsToArray(arguments));
						},

						/**
						 * 指定された関数に対して、コンテキスト(this)をコントローラに変更し、元々のthisを第1引数に加えて実行する関数を返します。
						 *
						 * @param {Function} func 関数
						 * @return {Function} コンテキスト(this)をコントローラに変更し、元々のthisを第1引数に加えた関数
						 * @memberOf Controller
						 */
						ownWithOrg: function(/* var_args */) {
							throwErrorIfDisposed(this, 'ownWithOrg');
							return ownWithOrg.apply(this, argsToArray(arguments));
						},

						/**
						 * コントローラを要素へ再度バインドします。子コントローラでは使用できません。
						 *
						 * @memberOf Controller
						 * @param {String|Element|jQuery} targetElement
						 *            バインド対象とする要素のセレクタ、DOMエレメント、もしくはjQueryオブジェクト.<br />
						 *            セレクタで指定したときにバインド対象となる要素が存在しない、もしくは2つ以上存在する場合、エラーとなります。
						 * @param {Object} [param] 初期化パラメータ.<br />
						 *            初期化パラメータは __init, __readyの引数として渡されるオブジェクトの argsプロパティとして格納されます。
						 * @returns {Controller} コントローラ.
						 */
						bind: function(targetElement, param) {
							throwErrorIfDisposed(this, 'bind');
							if (!this.__controllerContext.isRoot) {
								throwFwError(ERR_CODE_BIND_UNBIND_DISPOSE_ROOT_ONLY);
							}

							var target = getBindTarget(targetElement, this);
							this.rootElement = target;
							this.view.__controller = this;
							var args = param ? param : null;
							initInternalProperty(this, args);
							triggerInit(this);
							return this;
						},

						/**
						 * コントローラのバインドを解除します。子コントローラでは使用できません。
						 *
						 * @memberOf Controller
						 */
						unbind: function() {
							throwErrorIfDisposed(this, 'unbind');
							throwErrorIfNoRootElement(this, 'unbind');
							if (!this.__controllerContext.isRoot) {
								throwFwError(ERR_CODE_BIND_UNBIND_DISPOSE_ROOT_ONLY);
							}
							if (!this.__controllerContext.isExecutedConstruct) {
								throwFwError(ERR_CODE_CONSTRUCT_CANNOT_CALL_UNBIND);
							}
							try {
								unbindController(this);
							} catch (e) {
								// __unbindの実行でエラーが出たらdisposeする
								disposeController(this, e);
							}
						},

						/**
						 * コントローラのリソースをすべて削除します。<br />
						 * <a href="#unbind">Controller#unbind()</a> の処理を包含しています。
						 *
						 * @returns {Promise} Promiseオブジェクト
						 * @memberOf Controller
						 */
						dispose: function() {
							throwErrorIfDisposed(this, 'dispose');
							if (!this.__controllerContext.isRoot) {
								throwFwError(ERR_CODE_BIND_UNBIND_DISPOSE_ROOT_ONLY);
							}
							return disposeController(this);
						},

						/**
						 * インジケータの生成を上位コントローラまたはフレームワークに移譲します。<br>
						 * 例えば、子コントローラにおいてインジケータのカバー範囲を親コントローラ全体（または画面全体）にしたい場合などに使用します。<br>
						 * このメソッドを実行すると、「triggerIndicator」という名前のイベントが発生します。また、イベント引数としてオプションパラメータを含んだオブジェクトが渡されます。<br>
						 * イベントがdocumentまで到達した場合、フレームワークが自動的にインジケータを生成します。<br>
						 * 途中のコントローラでインジケータを生成した場合はevent.stopPropagation()を呼んでイベントの伝搬を停止し、イベント引数で渡されたオブジェクトの
						 * <code>indicator</code>プロパティに生成したインジケータインスタンスを代入してください。<br>
						 * indicatorプロパティの値がこのメソッドの戻り値となります。<br>
						 *
						 * @param {Object} opt オプション
						 * @param {String} [opt.message] メッセージ
						 * @param {Number} [opt.percent] 進捗を0～100の値で指定する。
						 * @param {Boolean} [opt.block] 操作できないよう画面をブロックするか (true:する/false:しない)
						 * @returns {Indicator} インジケータオブジェクト
						 * @memberOf Controller
						 */
						triggerIndicator: function(opt) {
							throwErrorIfDisposed(this, 'triggerIndicator');
							throwErrorIfNoRootElement(this, 'triggerIndicator');
							var args = {
								indicator: null
							};
							if (opt) {
								$.extend(args, opt);
							}

							$(this.rootElement).trigger(EVENT_NAME_TRIGGER_INDICATOR, [args]);
							return args.indicator;
						},

						/**
						 * 指定された要素に対して、インジケータ(メッセージ・画面ブロック・進捗)の表示や非表示を行うためのオブジェクトを取得します。
						 * <p>
						 * <a href="h5.ui.html#indicator">h5.ui.indicator</a>と同様にインジケータオブジェクトを取得する関数ですが、ターゲットの指定方法について以下の点で<a
						 * href="h5.ui.html#indicator">h5.ui.indicator</a>と異なります。
						 * <p>
						 * <ul>
						 * <li>第1引数にパラメータオブジェクトを渡してください。</li>
						 *
						 * <pre><code>
						 * // thisはコントローラ
						 * this.indicator({
						 * 	target: this.rootElement
						 * }); // OK
						 * this.indicator(this.rootElement, option); // NG
						 * </code></pre>
						 *
						 * <li>targetの指定は省略できます。省略した場合はコントローラのルートエレメントがインジケータの出力先になります。</li>
						 * <li>targetにセレクタが渡された場合、要素の選択はコントローラのルートエレメントを起点にします。また、グローバルセレクタを使用できます。
						 * (コントローラのイベントハンドラ記述と同様です。)</li>
						 *
						 * <pre><code>
						 * // thisはコントローラ
						 * this.indicator({target:'.target'}); // コントローラのルートエレメント内のtargetクラス要素
						 * this.indicator({target:'{.target}'}); // $('.target')と同じ
						 * this.indicator({target:'{rootElement}'); // コントローラのルートエレメント(this.rootElementと同じ)
						 * this.indicator({target:'{document.body}'); // body要素
						 * </code></pre>
						 *
						 * </ul>
						 *
						 * @returns {Indicator} インジケータオブジェクト
						 * @memberOf Controller
						 * @see h5.ui.indicator
						 * @see Indicator
						 */
						indicator: function(opt) {
							throwErrorIfDisposed(this, 'indicator');
							throwErrorIfNoRootElement(this, 'indicator');
							return callIndicator(this, opt);
						},

						/**
						 * コントローラに定義されているリスナーの実行を許可します。
						 *
						 * @memberOf Controller
						 */
						enableListeners: function() {
							throwErrorIfDisposed(this, 'enableListeners');
							setExecuteListenersFlag(this, true);
						},

						/**
						 * コントローラに定義されているリスナーの実行を禁止します。
						 *
						 * @memberOf Controller
						 */
						disableListeners: function() {
							throwErrorIfDisposed(this, 'disableListeners');
							setExecuteListenersFlag(this, false);
						},

						/**
						 * 指定された値をメッセージとして例外をスローします。
						 * <p>
						 * 第一引数がオブジェクトまたは文字列によって、出力される内容が異なります。
						 * <p>
						 * <b>文字列の場合</b><br>
						 * 文字列に含まれる{0}、{1}、{2}...{n} (nは数字)を、第二引数以降に指定した値で置換し、それをメッセージ文字列とします。
						 * <p>
						 * <b>オブジェクトの場合</b><br>
						 * Erorrオブジェクトのdetailプロパティに、このオブジェクトを設定します。
						 *
						 * @memberOf Controller
						 * @param {String|Object} msgOrErrObj メッセージ文字列またはオブジェクト
						 * @param {Any} [var_args] 置換パラメータ(第一引数が文字列の場合のみ使用します)
						 */
						throwError: function(msgOrErrObj, var_args) {
							throwErrorIfDisposed(this, 'throwError');
							//引数の個数チェックはthrowCustomErrorで行う
							var args = argsToArray(arguments);
							args.unshift(null);
							this.throwCustomError.apply(this, args);
						},

						/**
						 * 指定された値をメッセージとして例外をスローします。
						 * <p>
						 * このメソッドでスローされたErrorオブジェクトのcustomTypeプロパティには、第一引数で指定した型情報が格納されます。
						 * <p>
						 * 第二引数がオブジェクトまたは文字列によって、出力される内容が異なります。
						 * <p>
						 * <b>文字列の場合</b><br>
						 * 文字列に含まれる{0}、{1}、{2}...{n} (nは数字)を、第二引数以降に指定した値で置換し、それをメッセージ文字列とします。
						 * <p>
						 * <b>オブジェクトの場合</b><br>
						 * Erorrオブジェクトのdetailプロパティに、このオブジェクトを設定します。
						 *
						 * @memberOf Controller
						 * @param {String} customType 型情報
						 * @param {String|Object} msgOrErrObj メッセージ文字列またはオブジェクト
						 * @param {Any} [var_args] 置換パラメータ(第一引数が文字列の場合のみ使用します)
						 */
						throwCustomError: function(customType, msgOrErrObj, var_args) {
							throwErrorIfDisposed(this, 'throwCustomError');
							if (arguments.length < 2) {
								throwFwError(ERR_CODE_TOO_FEW_ARGUMENTS);
							}

							var error = null;

							if (msgOrErrObj && isString(msgOrErrObj)) {
								error = new Error(format.apply(null, argsToArray(arguments)
										.slice(1)));
							} else {
								// 引数を渡さないと、iOS4は"unknown error"、その他のブラウザは空文字が、デフォルトのエラーメッセージとして入る
								error = new Error();
								error.detail = msgOrErrObj;
							}
							error.customType = customType;
							throw error;
						},

						/**
						 * イベントハンドラを動的にバインドします。
						 * <p>
						 * 第1引数targetの指定にはコントローラのイベントハンドラ記述と同様の記述ができます。
						 * つまりセレクタの場合はルートエレメントを起点に選択します。またグローバルセレクタで指定することもできます。、
						 * </p>
						 * <p>
						 * ここで追加したハンドラはコントローラのunbind時にアンバインドされます。
						 * </p>
						 *
						 * @memberOf Controller
						 * @param target {String|Object} イベントハンドラのターゲット
						 * @param eventName {String} イベント名
						 * @param listener {Function} ハンドラ
						 */
						on: function(target, eventName, listener) {
							throwErrorIfDisposed(this, 'on');
							throwErrorIfNoRootElement(this, 'on');
							// バインドオブジェクトの作成
							var info = createEventHandlerInfo(target, eventName, this);
							var bindObjects = createBindObjects(this, info, listener);

							// バインドオブジェクトに基づいてバインド
							for (var i = 0, l = bindObjects.length; i < l; i++) {
								var bindObj = bindObjects[i];
								bindByBindObject(bindObj, getDocumentOf(this.rootElement));
							}
						},

						/**
						 * イベントハンドラを動的にアンバインドします。
						 * <p>
						 * 第1引数targetの指定にはコントローラのイベントハンドラ記述と同様の記述ができます。
						 * つまりセレクタの場合はルートエレメントを起点に選択します。またグローバルセレクタで指定することもできます。、
						 * </p>
						 *
						 * @memberOf Controller
						 * @param target {String|Object} イベントハンドラのターゲット
						 * @param eventName {String} イベント名
						 * @param listener {Function} ハンドラ
						 */
						off: function(target, eventName, listener) {
							throwErrorIfDisposed(this, 'off');
							throwErrorIfNoRootElement(this, 'off');
							// 指定された条件にマッチするbindObjをboundHandlersから探して取得する
							var info = createEventHandlerInfo(target, eventName, this);
							var boundHandlers = this.__controllerContext.boundHandlers;

							var matchBindObj = null;
							var bindTarget = info.bindTarget;
							var eventName = info.eventName;
							var selector = info.selector;
							var isGlobal = info.isGlobal;
							var isBindRequested = info.isBindRequested;

							var index = 0;
							for (var l = boundHandlers.length; index < l; index++) {
								var bindObj = boundHandlers[index];
								if (bindTarget) {
									// offでオブジェクトやDOMをターゲットに指定された場合はbindTarget、eventName、originalHandlerを比較
									if (isSameBindTarget(bindTarget, bindObj.bindTarget)
											&& eventName === bindObj.eventName
											&& bindObj.originalHandler === listener) {
										matchBindObj = bindObj;
										break;
									}
								} else {
									// offでセレクタを指定された場合、セレクタと、グローバル指定かどうかと、isBindRequestedとoriginalHandlerを比較
									if (selector === bindObj.selector
											&& isGlobal === bindObj.isGlobal
											&& isBindRequested === bindObj.isBindRequested
											&& listener === bindObj.originalHandler) {
										matchBindObj = bindObj;
										break;
									}
								}
							}
							if (matchBindObj) {
								unbindByBindObject(matchBindObj, getDocumentOf(this.rootElement));
							}
						},

						/**
						 * コントローラを子コントローラとして動的に追加します
						 * <p>
						 * 追加されたコントローラは呼び出し元のコントローラの子コントローラとなります。
						 * </p>
						 *
						 * @param {Controller} コントローラインスタンス
						 */
						manageChild: function(controller) {
							throwErrorIfDisposed(this, 'manageChild');
							// 自分自身がunbindされていたらエラー
							if (isUnbinding(this)) {
								throwFwError(ERR_CODE_CONTROLLER_MANAGE_CHILD_BY_UNBINDED_CONTROLLER);
								return;
							}
							// コントローラインスタンスでない場合はエラー
							if (!controller || !controller.__controllerContext) {
								throwFwError(ERR_CODE_CONTROLLER_MANAGE_CHILD_NOT_CONTROLLER);
								return;
							}
							// 対象のコントローラがdisopseまたはunbindされていたらエラー
							if (isUnbinding(controller)) {
								throwFwError(ERR_CODE_CONTROLLER_MANAGE_CHILD_UNBINDED_CONTROLLER);
								return;
							}
							// ルートコントローラでない場合はエラー
							if (controller.rootController !== controller) {
								throwFwError(ERR_CODE_CONTROLLER_MANAGE_CHILD_NOT_ROOT_CONTROLLER);
							}
							// 必要なプロパティをセット
							addChildController(this, controller);
							// manageChildしたコントローラはルートコントローラで無くなるので、controllerManagerの管理下から外す
							var controllers = controllerManager.controllers;
							var index = $.inArray(controller, controllers);
							if (index != -1) {
								controllers.splice(index, 1);
							}
						},

						/**
						 * 子コントローラを動的に削除
						 *
						 * @param {Controller} コントローラインスタンス
						 * @param {Boolean} [andDispose=true]
						 *            第1引数で指定されたコントローラをdisposeするかどうか。指定無しの場合はdisposeします。
						 * @returns {Promise}
						 */
						unmanageChild: function(controller, andDispose) {
							throwErrorIfDisposed(this, 'unmanageChild');
							// 自分自身がunbindされていたらエラー
							if (isUnbinding(this)) {
								throwFwError(ERR_CODE_CONTROLLER_UNMANAGE_CHILD_BY_UNBINDED_CONTROLLER);
								return;
							}
							// 対象のコントローラが自分の子コントローラでないならエラー
							if (controller.parentController !== this) {
								throwFwError(ERR_CODE_CONTROLLER_UNMANAGE_CHILD_NOT_CHILD_CONTROLLER);
								return;
							}
							// disposeするかどうか。デフォルトtrue(disposeする)
							andDispose = andDispose === false ? false : true;
							if (!andDispose && !controller.rootElement) {
								// ルートエレメント未決定コントローラはdisposeせずにunmanageChildできない
								throwFwError(ERR_CODE_CONTROLLER_UNMANAGE_CHILD_NO_ROOT_ELEMENT);
								return;
							}
							removeChildController(this, controller, andDispose);
							if (andDispose) {
								controller.dispose();
								return;
							}
							// disposeしない場合、unmanageChildしたコントローラはルートコントローラになるので、controllerManagerの管理下に追加
							controllerManager.controllers.push(controller);
							// 親子間に待機中のプロミスがあればそれを削除
							var parentWaitingPromisesManagerMap = this.__controllerContext.waitingPromisesManagerMap;
							var childWaitingPromisesManagerMap = controller.__controllerContext.waitingPromisesManagerMap;

							if (parentWaitingPromisesManagerMap) {
								if (parentWaitingPromisesManagerMap['__postInit']) {
									parentWaitingPromisesManagerMap['__postInit']
											.remove(controller.postInitPromise);
								}
								if (parentWaitingPromisesManagerMap['__ready']) {
									parentWaitingPromisesManagerMap['__ready']
											.remove(controller.readyPromise);
								}
							}
							if (childWaitingPromisesManagerMap) {
								if (childWaitingPromisesManagerMap['__init']) {
									childWaitingPromisesManagerMap['__init']
											.remove(this.initPromise);
								}
							}

							// 元のルートコントローラによって、triggerPostInitやtriggerReadyが呼ばれていない状態ならここで呼ぶ
							// (子コントローラが待機中のプロミスは無く、ルートがtriggerPostInitやtriggerReadyまで行っていない状態)
							// initはコントローラバインド時に必ず呼ばれるのでここで呼ぶ必要はない
							if (!this.rootController.__controllerContext.triggerPostInitExecuted) {
								triggerPostInit(controller);
							} else if (!this.rootController.__controllerContext.triggerReadyInitExecuted) {
								triggerReady(controller);
							}
						}
					});

	/**
	 * コントローラマネージャクラス
	 *
	 * @name ControllerManager
	 * @class
	 */
	function ControllerManager() {
		this.rootElement = document;
		this.controllers = [];

		/**
		 * triggerIndicatorイベントハンドラ
		 *
		 * @param {EventContext} context
		 * @memberOf ControllerManager
		 * @private
		 */
		$(document).bind(EVENT_NAME_TRIGGER_INDICATOR, function(event, opt) {
			if (opt.target == null) {
				opt.target = document;
			}
			opt.indicator = callIndicator(this, opt);
			event.stopPropagation();
		});
	}
	// eventDispatcherをmixin
	h5.mixin.eventDispatcher.mix(ControllerManager.prototype);
	$
			.extend(
					ControllerManager.prototype,
					{
						/**
						 * 現在動作しているすべてのコントローラのインスタンスの配列を返します。<br>
						 * 子コントローラは含まれません。すなわち、ルートコントローラのみが含まれます。
						 *
						 * @returns {Controller[]} コントローラ配列
						 * @memberOf ControllerManager
						 */
						getAllControllers: function() {
							return this.controllers;
						},

						/**
						 * 指定した要素にバインドされているすべてのコントローラを返します。バインドされているコントローラがない場合は空の配列が返ります。<br>
						 * オプションを指定すると、子孫要素も検索対象に含めたり、特定の名前のコントローラだけを検索対象にしたりすることができます。<br>
						 * なお、戻り値に含まれるのはルートコントローラのみです。
						 *
						 * @param {String|Element|jQuery} rootElement 検索対象の要素
						 * @param {Object} [option] オプション（ver.1.1.7以降）
						 * @param {Boolean} [option.deep=false]
						 *            子孫要素にバインドされているコントローラも含めるかどうか(ver.1.1.7以降)
						 * @param {String|String[]} [option.name=null]
						 *            指定された場合、この名前のコントローラのみを戻り値に含めます。配列で複数指定することも可能です。(ver.1.1.7以降)
						 * @returns {Controller[]} バインドされているコントローラの配列
						 * @memberOf ControllerManager
						 */
						getControllers: function(rootElement, option) {
							var deep = option && option.deep;
							var names = option && option.name ? wrapInArray(option.name) : null;

							var seekRoot = $(rootElement)[0];
							var controllers = this.controllers;
							var ret = [];
							for (var i = 0, len = controllers.length; i < len; i++) {
								var controller = controllers[i];

								if (names && $.inArray(controller.__name, names) === -1
										|| !controller.rootElement) {
									continue;
								}

								if (seekRoot === controller.rootElement) {
									ret.push(controller);
								} else if (deep
										&& getDocumentOf(seekRoot) === getDocumentOf(controller.rootElement)
										&& $.contains(seekRoot, controller.rootElement)) {
									// ownerDocumentが同じ場合に$.contais()の判定を行う
									// (IE8でwindow.open()で開いたポップアップウィンドウ内の要素と
									// 元ページ内の要素で$.contains()の判定を行うとエラーになるため。)
									// また、$.contains()は自分と比較した場合はfalse
									ret.push(controller);
								}
							}
							return ret;
						}
					});

	/**
	 * キャッシュマネージャクラス
	 * <p>
	 * マップを使ってキャッシュの登録、削除を行うクラス
	 * </p>
	 * <p>
	 * このクラスは自分でnewすることはありません。<a
	 * href="h5.core.html#definitionCacheManager">h5.core.definitionCacheManager</a>がこのクラスのメソッド(<a
	 * href="#clear">clear()</a>,<a href="#clearAll">clearAll()</a>)を持ちます。
	 * </p>
	 *
	 * @class CacheManager
	 */
	function CacheManager() {
		this._init();
	}
	$.extend(CacheManager.prototype, {
		/**
		 * コントローラの名前からキャッシュを取り出す。 無ければnullを返す。
		 *
		 * @private
		 * @memberOf CacheManager
		 * @param {String} name
		 */
		get: function(name) {
			return this._cacheMap[name];
		},

		/**
		 * キャッシュを登録する。
		 *
		 * @private
		 * @memberOf CacheManager
		 */
		register: function(name, cacheObj) {
			this._cacheMap[name] = cacheObj;
		},

		/**
		 * 名前を指定してキャッシュをクリアする
		 *
		 * @param {String} name コントローラまたはロジックの名前(__nameの値)
		 * @memberOf CacheManager
		 */
		clear: function(name) {
			delete this._cacheMap[name];
		},

		/**
		 * キャッシュを全てクリアする
		 *
		 * @memberOf CacheManager
		 */
		clearAll: function() {
			this._cacheMap = {};
		},

		/**
		 * 初期化処理
		 *
		 * @private
		 * @memberOf CacheManager
		 */
		_init: function() {
			this._cacheMap = {};
		}
	});

	// キャッシュ変数にコントローラマネージャ、キャッシュマネージャのインスタンスをそれぞれ格納
	definitionCacheManager = new CacheManager();
	controllerManager = new ControllerManager();

	h5.u.obj.expose('h5.core', {
		/**
		 * コントローラマネージャ
		 *
		 * @name controllerManager
		 * @type ControllerManager
		 * @memberOf h5.core
		 */
		controllerManager: controllerManager,

		/**
		 * 定義オブジェクトのキャッシュを管理するキャッシュマネージャ
		 * <p>
		 * コントローラとロジックのキャッシュを管理する<a href="CacheManager.html">CacheManager</a>のインスタンスです。<a
		 * href="CacheManager.html#clear">clear</a>または<a
		 * href="CacheManager.html#clearAll">clearAll</a>を使ってキャッシュを削除することができます。
		 * </p>
		 * <p>
		 * コントローラ化、ロジック化の際に、コントローラ名及びロジック名で、インスタンス化に必要な情報をキャッシュしており、コントローラ及びロジックについて、同じ名前の定義オブジェクトは同じコントローラ、ロジックとして扱います。
		 * </p>
		 * <p>
		 * 同じ名前で定義の異なるコントローラ、ロジックを使用したい場合は、<a href="CacheManager.html#clear">clear</a>または<a
		 * href="CacheManager.html#clearAll">clearAll</a>でキャッシュを削除してください。
		 * </p>
		 *
		 * @name definitionCacheManager
		 * @type CacheManager
		 * @memberOf h5.core
		 */
		// clearとclearAllのみ公開
		definitionCacheManager: {
			clear: function(name) {
				definitionCacheManager.clear(name);
			},
			clearAll: function() {
				definitionCacheManager.clearAll();
			}
		}
	});

	// プロパティ重複チェック用のコントローラプロパティマップを作成
	var controllerPropertyMap = null;

	/**
	 * コントローラのファクトリ
	 *
	 * @private
	 * @param {String|Element|jQuery} targetElement バインド対象とする要素のセレクタ、DOMエレメント、もしくはjQueryオブジェクト
	 * @param {Object} controllerDefObj コントローラ定義オブジェクト
	 * @param {Object} [param] 初期化パラメータ
	 * @returns {Controller}
	 */
	// fwOptは内部的に使用している.
	function createAndBindController(targetElement, controllerDefObj, param, fwOpt) {
		// 内部から再帰的に呼び出された場合は、fwOpt.isInternalが指定されているはずなので、ルートコントローラかどうかはfwOpt.isInternalで判別できる
		var isRoot = !fwOpt || !fwOpt.isInternal;
		if (!isRoot && isDisposed(fwOpt.rootController)) {
			// ルートコントローラがdisposeされていたら何もしない
			return null;
		}

		// コントローラ名
		var controllerName = controllerDefObj.__name;
		if ((!isString(controllerName) || $.trim(controllerName).length === 0)
				&& !isDependency(controllerDefObj)) {
			// Dependency指定の場合を除いて、文字列じゃない又は空文字、空白文字の場合はエラー
			throwFwError(ERR_CODE_INVALID_CONTROLLER_NAME, null, {
				controllerDefObj: controllerDefObj
			});
		}

		// 初期化開始のログ
		fwLogger.debug(FW_LOG_INIT_CONTROLLER_BEGIN, controllerName);

		// 初期化パラメータがオブジェクトかどうかチェック
		if (param && !$.isPlainObject(param)) {
			throwFwError(ERR_CODE_CONTROLLER_INVALID_INIT_PARAM, [controllerName], {
				controllerDefObj: controllerDefObj
			});
		}

		// 既にコントローラ化されているかどうかチェック
		if (controllerDefObj.__controllerContext) {
			throwFwError(ERR_CODE_CONTROLLER_ALREADY_CREATED, null, {
				controllerDefObj: controllerDefObj
			});
		}

		// キャッシュの取得(無かったらundefined)
		var cache = definitionCacheManager.get(controllerName);

		// コントローラ定義オブジェクトのチェック
		// キャッシュがある場合はコントローラ定義オブジェクトについてはチェック済みなのでチェックしない
		if (!cache) {
			validateControllerDef(isRoot, targetElement, controllerDefObj, param, controllerName);
		}

		// 循環参照チェックはキャッシュが残っていても行う
		// cache作成時にチェックしてOKだったとしても、子コントローラの中身が変わってしまっていることがあるため
		if (isRoot) {
			// コントローラの循環参照チェック(ルートコントローラで1度やればよい)
			validateControllerCircularRef(controllerDefObj, controllerName);
		}

		// キャッシュが無かった場合、キャッシュの作成と登録
		if (!cache) {
			cache = createControllerCache(controllerDefObj);
			definitionCacheManager.register(controllerName, cache);
		}

		if (isRoot) {
			// ルートコントローラの場合はバインド対象となる要素のチェックを同期で行う
			// (子コントローラの時は親の__init後にチェックしている)
			// 文字列、オブジェクト(配列含む)でない場合はエラー (それぞれ、セレクタ、DOMオブジェクト(またはjQueryオブジェクト)を想定している)
			validateTargetElement(targetElement, controllerDefObj, controllerName);
		}

		// new Controllerで渡すコントローラ定義オブジェクトはクローンしたものではなくオリジナルなものを渡す。
		// コントローラが持つコントローラ定義オブジェクトはオリジナルのものになる。
		var controller = new Controller(targetElement ? $(targetElement).get(0) : null,
				controllerName, controllerDefObj, param, isRoot);

		var rootController = isRoot ? controller : fwOpt.rootController;

		// ------ controllerContextの作成 ------//
		// Deferred,Promiseの作成
		// preInitPromise, initPromise, postInitPromiseが失敗してもcFHを発火させないようにするため、dummyのfailハンドラを登録する
		var preInitDfd = getDeferred();
		var preInitPromise = preInitDfd.promise().fail(dummyFailHandler);
		var initDfd = getDeferred();
		var initPromise = initDfd.promise().fail(dummyFailHandler);
		var postInitDfd = getDeferred();
		var postInitPromise = postInitDfd.promise().fail(dummyFailHandler);
		var readyDfd = getDeferred();
		var readyPromise = readyDfd.promise();
		// async:falseならresolve済みにしておいて同期でバインドされるようにする(内部で使用するオプション)
		var async = fwOpt && fwOpt.async;
		if (async === false) {
			preInitDfd.resolve();
			initDfd.resolve();
			postInitDfd.resolve();
			readyDfd.resolve();
		}

		if (!isRoot) {
			// ルートコントローラでないなら、readyPromiseの失敗でcommonFailHandlerを発火させないようにする
			// (ルートコントローラのreadyPromiseのみ、失敗したらcommonFailHandlerが発火する)
			readyPromise.fail(dummyFailHandler);
		}
		/* del begin */
		else {
			// ルートコントローラなら、readyPromise.doneのタイミングで、ログを出力する
			readyPromise.done(function() {
				fwLogger.info(FW_LOG_INIT_CONTROLLER_COMPLETE, controllerName);
			});
		}
		/* del end */

		// __controllerContextに必要な情報を持たせる
		var controllerContext = controller.__controllerContext;
		// cacheを持たせる
		controllerContext.cache = cache;
		// 各ライフサイクルのdeferredを持たせる
		controllerContext.preInitDfd = preInitDfd;
		controllerContext.initDfd = initDfd;
		controllerContext.postInitDfd = postInitDfd;
		controllerContext.readyDfd = readyDfd;

		// コントローラにpromiseを持たせる
		controller.preInitPromise = preInitPromise;
		controller.initPromise = initPromise;
		controller.postInitPromise = postInitPromise;
		controller.readyPromise = readyPromise;

		// 子コントローラを保持する配列を持たせる
		controllerContext.childControllers = [];

		// 子コントローラ、ロジック依存関係解決のプロミス
		var promisesForTriggerInit = isRoot ? [] : fwOpt.promisesForTriggerInit;

		// ロジック定義をロジック化
		// ロジック定義はクローンされたものではなく、定義時に記述されたものを使用する
		// ロジックが持つロジック定義オブジェクトはオリジナルの定義オブジェクトになる
		for (var i = 0, l = cache.logicProperties.length; i < l; i++) {
			var prop = cache.logicProperties[i];
			var logicDef = controllerDefObj[prop];
			if (isDependency(logicDef)) {
				// Dependencyオブジェクトが指定されていた場合は依存関係を解決する
				var promise = logicDef.resolve('namespace');
				promisesForTriggerInit.push(promise);
				promise.done((function(logicProp, logicPromise) {
					return function(logic) {
						var logicInstance = createLogic(logic);
						controller[logicProp] = logicInstance;
						// ロジック化が終わったらコントローラが待機するプロミスから取り除く
						promisesForTriggerInit.splice($.inArray(logicPromise,
								promisesForTriggerInit), 1);
						// ロジックのreadyPromiseを追加
						promisesForTriggerInit.push(logicInstance.readyPromise);
						// ロジックのreadyPromiseがdoneになったらpromisesForTriggerInitから取り除く
						logicInstance.readyPromise.done((function(logicReadyPromise) {
							return function() {
								promisesForTriggerInit.splice($.inArray(logicReadyPromise,
										promisesForTriggerInit), 1);
							};
						})(logicInstance.readyPromise));
					};
				})(prop, promise));
			} else {
				controller[prop] = createLogic(logicDef);
			}
		}

		// templateDfdの設定
		var clonedControllerDef = $.extend(true, {}, controllerDefObj);
		var templates = controllerDefObj.__templates;
		var templateDfd = getDeferred();
		var templatePromise = templateDfd.promise();
		if (isDependency(templates) || templates && templates.length > 0) {
			// テンプレートファイルのロードを待機する処理を設定する
			setTemlatesDeferred(controller, templateDfd, templates);
		} else {
			// テンプレートの指定がない場合は、resolve()しておく
			templateDfd.resolve();
		}

		// テンプレートプロミスのハンドラ登録
		templatePromise.done(function() {
			if (!isDisposing(controller)) {
				// thisをコントローラにしてresolve
				preInitDfd.resolveWith(controller);
			}
		}).fail(function(e) {
			// eはview.load()のfailに渡されたエラーオブジェクト
			// thisをコントローラにしてreject
			preInitDfd.rejectWith(controller, [e]);

			/* del begin */
			// disposeされていなければルートコントローラの名前でログを出力
			if (controller.rootController && !isDisposing(controller.rootController)) {
				fwLogger.error(FW_LOG_INIT_CONTROLLER_ERROR, controller.rootController.__name);
			}
			/* del end */

			// disposeする
			// 同じrootControllerを持つ他の子コントローラにdisposeされているかどうか
			// (controller.rootControllerがnullになっていないか)をチェックをしてからdisposeする
			disposeController(controller, null, e);
		});

		// イベントハンドラにアスペクトを設定
		for (var i = 0, l = cache.eventHandlerProperties.length; i < l; i++) {
			var prop = cache.eventHandlerProperties[i];
			controller[prop] = weaveAspect(clonedControllerDef, prop, true);
		}

		// イベントハンドラではないメソッド(ライフサイクル含む)にアスペクトを設定
		for (var i = 0, l = cache.functionProperties.length; i < l; i++) {
			var prop = cache.functionProperties[i];
			// アスペクトを設定する
			controller[prop] = weaveAspect(clonedControllerDef, prop);
		}

		// その他プロパティをコピー
		for (var i = 0, l = cache.otherProperties.length; i < l; i++) {
			var prop = cache.otherProperties[i];
			controller[prop] = clonedControllerDef[prop];
		}

		// コントローラマネージャの管理対象とするか判定する(fwOpt.managed===falseなら管理対象外)
		controllerContext.managed = fwOpt && fwOpt.managed;

		// __constructを実行(子コントローラのコントローラ化より前)
		try {
			controller.__construct
					&& controller.__construct(createInitializationContext(controller));
			if (isDisposing(controller)) {
				// 途中(__constructの中)でdisposeされたら__constructの実行を中断
				return null;
			}
		} catch (e) {
			// ルートコントローラを渡してdisposeする
			disposeController(rootController, e);
			return null;
		}

		// __construct呼び出し後にparentControllerとrootControllerの設定
		if (isRoot) {
			// ルートコントローラの場合(parentが無い場合)、rootControllerは自分自身、parentControllerはnull
			controller.rootController = controller;
			controller.parentController = null;
		} else {
			// rootControllerはisRoot===trueのコントローラには設定済みなので、親から子に同じrootControllerを引き継ぐ
			controller.parentController = fwOpt.parentController;
			controller.rootController = fwOpt.rootController;
		}

		// 動的に追加されたコントローラ(__constructのタイミングで追加されたコントローラ)について、
		// ルートコントローラを設定する
		if (controller.__controllerContext.childControllers) {
			for (var i = 0, childs = controller.__controllerContext.childControllers, l = childs.length; i < l; i++) {
				childs[i].rootController = controller.rootController;
			}
		}

		// __construct実行フェーズが完了したかどうか
		// この時点でunbind()呼び出しが可能になる
		controller.__controllerContext.isExecutedConstruct = true;

		// 子コントローラをコントローラ化して持たせる
		// 子コントローラがDependencyオブジェクトなら依存関係を解決
		for (var i = 0, l = cache.childControllerProperties.length; i < l; i++) {
			// createAndBindControllerの呼び出し時に、fwOpt.isInternalを指定して、内部からの呼び出し(=子コントローラ)であることが分かるようにする
			var prop = cache.childControllerProperties[i];
			var childController = clonedControllerDef[prop];
			if (isDependency(childController)) {
				// Dependencyオブジェクトが指定されていた場合は依存関係を解決する
				var promise = childController.resolve('namespace');
				promisesForTriggerInit.push(promise);
				promise.done((function(childProp, childControllerPromise) {
					return function(c) {
						var child = createAndBindController(null, $.extend(true, {}, c), param, {
							isInternal: true,
							parentController: controller,
							rootController: rootController,
							promisesForTriggerInit: promisesForTriggerInit,
							async: async
						});
						if (child == null) {
							// __constructで失敗したりdisposeされた場合はnullが返ってくるので
							// 子コントローラの__constructが正しく実行されなかった場合は以降何もしない
							return null;
						}
						controller[childProp] = child;
						controller.__controllerContext.childControllers.push(child);
						// createAndBindControllerの呼び出しが終わったら、プロミスを取り除く
						promisesForTriggerInit.splice($.inArray(childControllerPromise,
								promisesForTriggerInit), 1);
					};
				})(prop, promise));
			} else {
				var child = createAndBindController(null, $.extend(true, {},
						clonedControllerDef[prop]), param, {
					isInternal: true,
					parentController: controller,
					rootController: rootController
				});

				if (child == null) {
					// __constructで失敗したりdisposeされた場合はnullが返ってくるので
					// 子コントローラの__constructが正しく実行されなかった場合は以降何もしない
					return null;
				}
				controller.__controllerContext.childControllers.push(child);
				controller[prop] = child;
			}
		}

		if (isRoot) {
			// ルートコントローラなら自分以下のinitを実行
			// promisesForTriggerInitは子コントローラの依存解決
			function constructPromiseCheck() {
				if (promisesForTriggerInit.length === 0) {
					// 待機中のプロミスがもうないならinit開始
					triggerInit(controller, async);
					return;
				}
				// 子孫にpromiseを追加されていた場合(さらに待機するコンストラクタがあった場合)
				// 再度待機する
				waitAllConstructPromise();
			}
			function waitAllConstructPromise() {
				waitForPromises(promisesForTriggerInit, constructPromiseCheck);
			}
			waitAllConstructPromise();
		}
		return controller;
	}

	/**
	 * オブジェクトのロジック化を行います。
	 *
	 * @param {Object} logicDefObj ロジック定義オブジェクト
	 * @returns {Logic}
	 * @name logic
	 * @function
	 * @memberOf h5.core
	 */
	function createLogic(logicDefObj) {
		var readyDfd = h5.async.deferred();
		var readyPromise = readyDfd.promise();
		var logicTreeDependencyPromises = [];

		function create(defObj, isRoot) {
			var logicName = defObj.__name;

			// エラーチェック
			if (!isString(logicName) || $.trim(logicName).length === 0) {
				// __nameが不正
				throwFwError(ERR_CODE_INVALID_LOGIC_NAME, null, {
					logicDefObj: defObj
				});
			}

			if (defObj.__logicContext) {
				// すでにロジックがインスタンス化されている
				throwFwError(ERR_CODE_LOGIC_ALREADY_CREATED, null, {
					logicDefObj: defObj
				});
			}

			// キャッシュの取得
			var cache = definitionCacheManager.get(logicName);
			if (!cache) {
				// キャッシュが無い場合で、ルートロジックなら循環参照チェック
				// ロジックの循環参照チェック(ルートで1度やればよい)
				if (isRoot) {
					validateLogicCircularRef(defObj);
				}
				// キャッシュの作成
				cache = createLogicCache(defObj);
			}

			// クローンしたものをロジック化する
			var logic = $.extend(true, {}, defObj);
			// アスペクトの設定
			var functionProperties = cache.functionProperties;
			for (var i = 0, l = functionProperties.length; i < l; i++) {
				var prop = functionProperties[i];
				logic[prop] = weaveAspect(logic, prop);
			}
			logic.deferred = getDeferred;
			logic.log = h5.log.createLogger(logicName);
			logic.__logicContext = {
				// ロジック定義オブジェクトはクローンしたものではなくオリジナルのものを持たせる
				logicDef: defObj
			};
			logic.own = own;
			logic.ownWithOrg = ownWithOrg;

			// キャッシュへ登録
			definitionCacheManager.register(logicName, cache);

			// __constructの実行
			// 親から実行する
			if (isFunction(logic.__construct)) {
				logic.__construct();
			}

			// ロジックが持っているロジック定義もロジック化
			var logicProperties = cache.logicProperties;
			for (var i = 0, l = logicProperties.length; i < l; i++) {
				var prop = logicProperties[i];
				var childLogicDef = logic[prop];
				if (isDependency(childLogicDef)) {
					// 子ロジックがDependencyならresolveしてからロジック化する
					var promise = childLogicDef.resolve();
					// ロジックツリーの待機するプロミスに追加
					logicTreeDependencyPromises.push(promise);
					promise.done((function(childLogicProp, logicPromise) {
						return function(resolvedLogicDef) {
							// ロジック化
							logic[childLogicProp] = create(resolvedLogicDef);
							// ロジックツリーの待機するプロミスから取り除く
							logicTreeDependencyPromises.splice($.inArray(logicPromise,
									logicTreeDependencyPromises), 1);
						};
					})(prop, promise));
				} else {
					logic[prop] = create(childLogicDef);
				}
			}

			return logic;
		}
		var rootLogic = create(logicDefObj, true);
		rootLogic.readyPromise = readyPromise;

		// ロジックツリーの依存解決が終わったタイミングで__readyの実行を開始
		function logicTreePromiseCheck() {
			if (logicTreeDependencyPromises.length === 0) {
				// 待機中のプロミスがもうないなら__readyの開始
				triggerLogicReady(rootLogic, readyDfd);
				return;
			}
			// 子孫にpromiseを追加されていた場合(さらに待機するコンストラクタがあった場合)
			// 再度待機する
			waitAllConstructPromise();
		}
		function waitAllConstructPromise() {
			waitForPromises(logicTreeDependencyPromises, logicTreePromiseCheck);
		}
		waitAllConstructPromise();

		return rootLogic;
	}

	/**
	 * コントローラ化時にコントローラに対して追加処理を行うフック関数を登録する関数
	 * <p>
	 * ここで登録したフック関数はコントローラインスタンス生成時(__construct呼び出し前)に呼ばれます
	 * </p>
	 *
	 * @memberOf h5internal.core
	 * @private
	 * @param {Function} func フック関数。第1引数にコントローラインスタンスが渡される
	 */
	function addControllerInstantiationHook(func) {
		controllerInstantiationHooks.push(func);
	}

	// =============================
	// Expose internally
	// =============================

	// fwOptを引数に取る、コントローラ化を行うメソッドを、h5internal.core.controllerInternalとして内部用に登録
	h5internal.core.controllerInternal = createAndBindController;

	// コントローラ化時にフック関数を登録する関数
	h5internal.core.addControllerInstantiationHook = addControllerInstantiationHook;

	h5internal.core.isDisposing = isDisposing;

	// =============================
	// Expose to window
	// =============================

	/**
	 * Core MVCの名前空間
	 *
	 * @name core
	 * @memberOf h5
	 * @namespace
	 */
	h5.u.obj.expose('h5.core', {
		/**
		 * オブジェクトのコントローラ化と、要素へのバインドを行います。
		 *
		 * @param {String|Element|jQuery} targetElement バインド対象とする要素のセレクタ、DOMエレメント、もしくはjQueryオブジェクト..<br />
		 *            セレクタで指定したときにバインド対象となる要素が存在しない、もしくは2つ以上存在する場合、エラーとなります。
		 * @param {Object} controllerDefObj コントローラ定義オブジェクト
		 * @param {Object} [param] 初期化パラメータ.<br />
		 *            初期化パラメータは __construct, __init, __readyの引数として渡されるオブジェクトの argsプロパティとして格納されます。
		 * @returns {Controller} コントローラ
		 * @name controller
		 * @function
		 * @memberOf h5.core
		 */
		controller: function(targetElement, controllerDefObj, param) {
			if (arguments.length < 2) {
				throwFwError(ERR_CODE_CONTROLLER_TOO_FEW_ARGS);
			}

			return createAndBindController(targetElement, controllerDefObj, param);
		},

		logic: createLogic,

		/**
		 * コントローラ、ロジックを__nameで公開します。<br />
		 * 例：__nameが"sample.namespace.controller.TestController"の場合、window.sample.namespace.controller.TestController
		 * で グローバルから辿れるようにします。
		 *
		 * @param {Controller|Logic} obj コントローラ、もしくはロジック
		 * @name expose
		 * @function
		 * @memberOf h5.core
		 */
		expose: function(obj) {
			var objName = obj.__name;
			if (!objName) {
				throwFwError(ERR_CODE_EXPOSE_NAME_REQUIRED, null, {
					target: obj
				});
			}
			var lastIndex = objName.lastIndexOf('.');
			if (lastIndex === -1) {
				window[objName] = obj;
			} else {
				var ns = objName.substr(0, lastIndex);
				var key = objName.substr(lastIndex + 1, objName.length);
				var nsObj = {};
				nsObj[key] = obj;
				h5.u.obj.expose(ns, nsObj);
			}
		},

		/**
		 * セレクタから子コントローラ定義を行うオブジェクト
		 *
		 * @param {String} セレクタ
		 */
		childFrom: function(selector) {
			return new Request(selector);
		}
	});
})();
/* ------ h5.core.data ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/**
	 * criteriaで'or'または'and'の論理演算子を指定するプロパティのマップ
	 *
	 * @private
	 */
	var OPERAND_PROPERTY = '__op';

	/**
	 * 比較関数と演算子のマップ
	 *
	 * @private
	 */
	var COMPARE_FUNCIONS = {
		'=': function(value, queryValue) {
			return value === queryValue;
		},
		'!=': function(value, queryValue) {
			return value !== queryValue;
		},
		'<': function(value, queryValue) {
			return value < queryValue;
		},
		'>': function(value, queryValue) {
			return value > queryValue;
		},
		'<=': function(value, queryValue) {
			return value <= queryValue;
		},
		'>=': function(value, queryValue) {
			return value >= queryValue;
		},
		'between': function(value, queryValue) {
			var lower = queryValue[0];
			var upper = queryValue[1];
			// 境界値を含む
			return lower <= value && value <= upper;
		},
		'!between': function(value, queryValue) {
			var lower = queryValue[0];
			var upper = queryValue[1];
			// 境界値を含まない
			return value < lower || upper < value;
		},
		'in': function(value, queryValue) {
			return $.inArray(value, queryValue) !== -1;
		},
		'!in': function(value, queryValue) {
			return $.inArray(value, queryValue) === -1;
		}
	};

	/**
	 * RegExp型を比較する関数と演算子のマップ
	 *
	 * @private
	 */
	var COMPARE_REGEXP_FUNCTIONS = {
		'=': function(value, queryValue) {
			return queryValue.test(value);
		},
		'!=': function(value, queryValue) {
			return !queryValue.test(value);
		}
	};

	/**
	 * Date型を比較する関数と演算子のマップ
	 *
	 * @private
	 */
	var COMPARE_DATE_FUNCIONS = {
		'=': function(value, queryValue) {
			if (!isDate(value)) {
				// Date型じゃない場合はfalseを返す(queryValueは必ずDate型であるため)
				return false;
			}
			return value.getTime() === queryValue.getTime();
		},
		'!=': function(value, queryValue) {
			if (!isDate(value)) {
				// Date型じゃない場合はtrueを返す(queryValueは必ずDate型であるため)
				return true;
			}
			return value.getTime() !== queryValue.getTime();
		},
		'<': function(value, queryValue) {
			if (!isDate(value)) {
				return false;
			}
			return value.getTime() < queryValue.getTime();
		},
		'>': function(value, queryValue) {
			if (!isDate(value)) {
				return false;
			}
			return value.getTime() > queryValue.getTime();
		},
		'<=': function(value, queryValue) {
			if (!isDate(value)) {
				return false;
			}
			return value.getTime() <= queryValue.getTime();
		},
		'>=': function(value, queryValue) {
			if (!isDate(value)) {
				return false;
			}
			return value.getTime() >= queryValue.getTime();
		},
		'between': function(value, queryValue) {
			if (!isDate(value)) {
				return false;
			}
			var lower = queryValue[0].getTime();
			var upper = queryValue[1].getTime();
			var valueTime = value.getTime();
			// 境界値を含む
			return lower <= valueTime && valueTime <= upper;
		},
		'!between': function(value, queryValue) {
			if (!isDate(value)) {
				return false;
			}
			var lower = queryValue[0].getTime();
			var upper = queryValue[1].getTime();
			var valueTime = value.getTime();
			// 境界値を含まない
			return valueTime < lower || upper < valueTime;
		},
		'in': function(value, queryValue) {
			if (!isDate(value)) {
				return false;
			}
			var valueTime = value.getTime();
			for (var i = 0, l = queryValue.length; i < l; i++) {
				if (valueTime === queryValue[i].getTime()) {
					return true;
				}
			}
			return false;
		},
		'!in': function(value, queryValue) {
			if (!isDate(value)) {
				return true;
			}
			var valueTime = value.getTime();
			for (var i = 0, l = queryValue.length; i < l; i++) {
				if (valueTime === queryValue[i].getTime()) {
					return false;
				}
			}
			return true;
		}
	};

	// -------------------------------
	// エラーコード
	// -------------------------------
	// TODO エラーコードの採番は決まってから適切な番号にする
	/** 指定された比較関数がない */
	var ERR_CODE_NO_COMPARE_FUNCTIONS = 1;

	/** ORDER BY句に指定されたkey名がschemaに存在しない */
	var ERR_CODE_ORDER_BY_KEY = 2;

	/** ORDER BY句に指定された、昇順、降順の指定が不正 */
	var ERR_CODE_ORDER_BY_CLAUSE = 3;

	/**
	 * 各エラーコードに対応するメッセージ
	 */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_NO_COMPARE_FUNCTIONS] = '演算子"{0}"で"{1}"型の値を比較することはできません';
	errMsgMap[ERR_CODE_ORDER_BY_KEY] = 'ORDER BY句の指定が不正です。指定されたキー({0})は存在しません';
	errMsgMap[ERR_CODE_ORDER_BY_CLAUSE] = 'ORDER BY句の指定が不正です。指定されたorder句:{0} "key名 ASC"または"key名 DESC"またはソート関数を指定してください';
	// メッセージの登録
	addFwErrorCodeMap(errMsgMap);

	// =============================
	// Development Only
	// =============================

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================


	// =============================
	// Functions
	// =============================
	/**
	 * 正規表現かどうか
	 *
	 * @private
	 * @param value
	 * @returns {Boolean}
	 */
	function isRegExp(value) {
		return value instanceof RegExp;
	}

	/**
	 * 日付型かどうか
	 *
	 * @private
	 * @param value
	 * @returns {Boolean}
	 */
	function isDate(value) {
		return value instanceof Date;
	}

	/**
	 * 各条件について結果をANDで評価する関数を生成して返します
	 *
	 * @private
	 * @param {Object} compiledCriteria コンパイル済みcriteria
	 * @returns {Function}
	 */
	function createANDCompareFunction(compiledCriteria) {
		// 各条件をANDで比較して返す関数
		return function(valueObj) {
			// クエリについてチェック
			var queries = compiledCriteria.queries;
			for (var i = 0, l = queries.length; i < l; i++) {
				var query = queries[i];
				var prop = query.prop;
				var queryValue = query.queryValue;
				var compareFunction = query.compareFunction;
				if (!compareFunction(valueObj[prop], queryValue)) {
					return false;
				}
			}
			// ユーザ関数についてチェック
			var userFunctions = compiledCriteria.userFunctions;
			for (var i = 0, l = userFunctions.length; i < l; i++) {
				if (!userFunctions[i](valueObj)) {
					return false;
				}
			}
			// ネストしたcriteriaについてチェック
			var nestedCriterias = compiledCriteria.nestedCriterias;
			for (var i = 0, l = nestedCriterias.length; i < l; i++) {
				if (!nestedCriterias[i].match(valueObj)) {
					return false;
				}
			}
			return true;
		};
	}

	/**
	 * 各条件について結果をORで評価する関数を生成して返します
	 *
	 * @private
	 * @param {Object} compiledCriteria コンパイル済みcriteria
	 * @returns {Function}
	 */
	function createORCompareFunction(compiledCriteria) {
		return function(valueObj) {
			// クエリについてチェック
			var queries = compiledCriteria.queries;
			for (var i = 0, l = queries.length; i < l; i++) {
				var query = queries[i];
				var prop = query.prop;
				var queryValue = query.queryValue;
				var compareFunction = query.compareFunction;
				if (compareFunction(valueObj[prop], queryValue)) {
					return true;
				}
			}
			// ユーザ関数についてチェック
			var userFunctions = compiledCriteria.userFunctions;
			for (var i = 0, l = userFunctions; i < l; i++) {
				if (!userFunctions[i](valueObj)) {
					return true;
				}
			}
			// ネストしたcriteriaについてチェック
			var nestedCriterias = compiledCriteria.nestedCriterias;
			for (var i = 0, l = nestedCriterias.length; i < l; i++) {
				if (nestedCriterias[i].match(valueObj)) {
					return true;
				}
			}
			return false;
		};
	}

	/**
	 * setLive()が呼ばれた時にDataModelにaddEventListenerするリスナを作成します
	 *
	 * @param {Query} query クエリクラス
	 * @returns {Function} リスナ
	 */
	function createChangeListener(query) {
		var match = query._criteria.match;
		var resultArray = query.result;
		return function(ev) {
			var removed = ev.removed;
			var created = ev.created;
			var changed = ev.changed;
			var isSorted = true;

			for (var i = 0, l = removed.length; i < l; i++) {
				// resultArrayの何番目に入っているアイテムか
				var resultIndex = $.inArray(removed[i], resultArray._src);
				// DataModelから削除されたら結果からも削除
				if (resultIndex !== -1) {
					resultArray.splice(resultIndex, 1);
				}
			}
			for (var i = 0, l = changed.length; i < l; i++) {
				// resultArrayの何番目に入っているアイテムか(入っていないなら-1)
				var resultIndex = $.inArray(changed[i].target, resultArray._src);
				// 中身が変更されたら再ソート
				isSorted = false;
				// マッチするかどうかチェックして、
				// マッチするかつ結果にないものなら追加
				// マッチしないかつ結果にあるものなら取り除く
				if (match(changed[i].target.get())) {
					if (resultIndex === -1) {
						resultArray.push(changed[i].target);
					}
				} else {
					if (resultIndex !== -1) {
						resultArray.splice(resultIndex, 1);
					}
				}
			}
			for (var i = 0, l = created.length; i < l; i++) {
				// 新しく作成されたアイテムがあればマッチするかどうかチェックして
				// マッチするなら結果に追加
				if (match(created[i].get())) {
					isSorted = false;
					resultArray.push(created[i]);
				}
			}

			// ソート
			if (query._compareFunction && !isSorted) {
				// ソートする必要があるならソートする
				resultArray.sort(query._compareFunction);
			}
		};
	}

	/**
	 * criteriaオブジェクトをコンパイルします
	 * <p>
	 * 以下のようなオブジェクトを生成します
	 * </p>
	 *
	 * <pre class="sh_javascript">
	 * {
	 *   queries: [{
	 *     prop: プロパティ名,
	 *     queryValue: 指定された値,
	 *     compareFunction: 指定された値と比較する関数,
	 *   }],
	 *   nestedCriterias: ネストされたcriteriaオブジェクト(コンパイル済み)の配列,
	 *   userFunctions: ユーザ指定関数の配列
	 * }
	 * </pre>
	 *
	 * @private
	 * @param {Object} criteria
	 * @returns {Object} コンパイル済みcriteriaオブジェクト
	 */
	function compileCriteria(criteria) {
		// criteriaの解析
		var queries = [];
		var nestedCriterias = [];
		var userFunctions = [];
		var compiledCriteria = {
			queries: queries,
			nestedCriterias: nestedCriterias,
			userFunctions: userFunctions
		};
		for ( var prop in criteria) {
			if (prop === OPERAND_PROPERTY) {
				continue;
			}
			if ($.isPlainObject(criteria[prop])) {
				// objectの場合はネストしたcriteriaオブジェクトとして解析して追加する
				nestedCriterias.push(compileCriteria(criteria[prop]));
				continue;
			}
			if (isFunction(criteria[prop])) {
				// 関数の場合はユーザ関数として追加
				userFunctions.push(criteria[prop]);
				continue;
			}
			var queryValue = criteria[prop];

			// queryValueのタイプをチェックする。配列指定なら先頭の要素でタイプを判定する
			var valueForTypeCheck = isArray(queryValue) ? queryValue[0] : queryValue;
			var compareFunctions = null;

			if (isRegExp(valueForTypeCheck)) {
				// 正規表現の場合
				compareFunctions = COMPARE_REGEXP_FUNCTIONS;
			} else if (isDate(valueForTypeCheck)) {
				// Dateクラスの場合
				compareFunctions = COMPARE_DATE_FUNCIONS;
			} else {
				// その他
				compareFunctions = COMPARE_FUNCIONS;
			}
			// プロパティ名とオペランドに分割。連続した空白文字は無視
			var tmp = $.trim(prop.replace(/ +/g, ' ')).split(' ');
			// 演算子省略時は'='で比較
			var op = tmp[1] || '=';
			var compareFunction = compareFunctions[op];
			// compareFunctionが無い場合はエラー
			if (!compareFunction) {
				throwFwError(ERR_CODE_NO_COMPARE_FUNCTIONS, [op, $.type(valueForTypeCheck)]);
			}

			queries.push({
				prop: tmp[0],
				queryValue: queryValue,
				compareFunction: compareFunction
			});
		}
		compiledCriteria.match = criteria[OPERAND_PROPERTY] === 'or' ? createORCompareFunction(compiledCriteria)
				: createANDCompareFunction(compiledCriteria);
		return compiledCriteria;
	}

	/**
	 * 指定されたキーでアイテムを昇順にソートするための比較関数を作成します
	 *
	 * @private
	 * @param {String} key データアイテムのキー名
	 * @returns {Function}
	 */
	function createAscCompareFunction(key) {
		return function(item1, item2) {
			var val1 = item1.get(key);
			var val2 = item2.get(key);
			if (val1 > val2) {
				return 1;
			}
			if (val1 < val2) {
				return -1;
			}
			return 0;
		};
	}

	/**
	 * 指定されたキーでアイテムを降順にソートするための比較関数を作成します
	 *
	 * @private
	 * @param {String} key データアイテムのキー名
	 * @returns {Function}
	 */
	function createDescCompareFunction(key) {
		return function(item1, item2) {
			var val1 = item1.get(key);
			var val2 = item2.get(key);
			if (val1 > val2) {
				return -1;
			}
			if (val1 < val2) {
				return 1;
			}
			return 0;
		};
	}

	/**
	 * Queryクラス
	 * <p>
	 * {@link DataModel#createQuery}の戻り値がこのクラスのインスタンスです。
	 * </p>
	 *
	 * @class
	 * @name Query
	 */
	/**
	 * @private
	 * @param {DataModel} model データモデル
	 */
	function Query(model) {
		/**
		 * 検索結果の配列(ObservableArray)
		 * <p>
		 * 検索結果配列は中身は変わってもインスタンスは変わりません。
		 * </p>
		 *
		 * @name result
		 * @memberOf Query
		 * @type {ObservableArray}
		 */
		this.result = h5.core.data.createObservableArray();

		/**
		 * 検索対象のデータモデル
		 *
		 * @private
		 * @name _model
		 * @memberOf Query
		 * @type {DataModel}
		 */
		this._model = model;

		/**
		 * ライブクエリかどうか。デフォルトfalse
		 *
		 * @private
		 * @name _isLive
		 * @memberOf Query
		 * @type {Boolean}
		 */
		this._isLive = false;
	}
	// TODO 今は何もイベントをあげていないのでeventDispatcherにする必要がない。仕様が決まったら対応する。
	//	h5.mixin.eventDispatcher.mix(Query.prototype);

	$.extend(Query.prototype, {
		/**
		 * 検索条件オブジェクトをセットします
		 * <p>
		 * 検索の実行({@link Query#execute})を実行した時に、ここで指定した検索条件オブジェクトに基づいて検索を実行します。
		 * </p>
		 * <p>
		 * 検索条件オブジェクトは、"プロパティ名 (演算子)"をキーにして、比較する値を値に持つオブジェクトを指定します。
		 * 複数のプロパティを持つオブジェクトはデフォルトではANDで評価します。
		 * <p>
		 * 演算子には、===,!==,==,!=,>=,<=,between,!between,in,!inを指定できます。省略した場合は===です。
		 * </p>
		 * 検索条件オブジェクトに"__op"プロパティを持たせて、値に'or'を記述すると、ORでの評価になります。 ('and'を設定すると記述しない場合と同様ANDでの評価になります。
		 * </p>
		 * <p>
		 * 詳細は{@link (TODO 未作成)|リファレンス&gt;Criteriaオブジェクト}をご覧ください
		 * </p>
		 *
		 * <pre class="sh_javascript">
		 * // 記述例
		 * // categoryが'book'で、nameに'HTML5'を含み、priceが3000未満のアイテムを検索する条件
		 * {
		 * 	category: 'book',
		 * 	name: /HTML5/,
		 * 	'price &lt;': 3000
		 * }
		 *
		 * // categoryが'game'または'movie'で、releaseDateが2014年以降のアイテムを検索する条件
		 * {
		 *   'category in': ['game', 'movie'],
		 *   'relaseDate &gt;=': new Date('2014/1/1')
		 * }
		 * </pre>
		 *
		 * @memberOf Query
		 * @param {Object} criteria 検索条件オブジェクト
		 * @returns {Query}
		 */
		setCriteria: function(criteria) {
			this._criteria = compileCriteria(criteria);
			if (this._isLive) {
				// ライブクエリならセット時に検索
				this.execute();
			}
			return this;
		},

		/**
		 * 検索を実行
		 * <p>
		 * {@link Query#setCriteria}で設定した検索条件で検索します。検索が完了すると{@link result}に結果が格納されます。
		 * </p>
		 * <p>
		 * また、{@link Query#onQueryComplete}に設定したハンドラが呼ばれます。
		 * </p>
		 *
		 * @memberOf Query
		 * @returns {Query}
		 */
		execute: function() {
			// 新しくdeferredを作成
			this._executeDfd = h5.async.deferred();
			var result = this.result;
			// resultを一旦空にする
			result.copyFrom(null);
			for ( var id in this._model.items) {
				var item = this._model.items[id];
				// マッチするなら結果に追加
				if (this._criteria.match(item.get())) {
					result.push(item);
				}
			}
			// ソート
			if (this._compareFunction) {
				result.sort(this._compareFunction);
			}
			this._executeDfd.resolveWith(this, [result]);
			return this;
		},

		/**
		 * execute()による検索が完了した時に実行するハンドラを登録
		 * <p>
		 * ハンドラの引数には検索結果(ObserevableArray)が渡されます
		 * </p>
		 *
		 * @memberOf Query
		 * @param {Function} completeHandler
		 * @returns {Query}
		 */
		onQueryComplete: function(completeHandler) {
			// TODO executeが呼ばれる前にハンドラを設定された場合はどうするか
			this._executeDfd.done(completeHandler);
			return this;
		},

		/**
		 * クエリをライブクエリにします
		 * <p>
		 * ライブクエリにすると、検索条件がセットされた時やDataModelに変更があった時に検索結果が動的に変更されます。(executeを呼ぶ必要がありません)
		 * </p>
		 *
		 * @see Query#unsetLive
		 * @memberOf Query
		 * @returns {Query}
		 */
		setLive: function() {
			// ライブクエリ設定済みなら何もしない
			if (this._isLive) {
				return;
			}
			// リスナ未作成なら作成
			this._listener = this._listener || createChangeListener(this);
			this._model.addEventListener('itemsChange', this._listener);
			this._isLive = true;

			return this;
		},

		/**
		 * ライブクエリを解除します
		 *
		 * @see Query#setLive
		 * @memberOf Query
		 * @returns {Query}
		 */
		unsetLive: function() {
			// ライブクエリでなければ何もしない
			if (!this._isLive) {
				return;
			}
			this._model.removeEventListener('itemsChange', this._listener);
			this._isLive = false;
			return this;
		},

		/**
		 * 検索結果のソート条件を設定
		 * <p>
		 * 比較関数または文字列で指定します
		 * </p>
		 * <p>
		 * 文字列の場合は、'プロパティ名 ASC|DESC'のようにしてします。指定したプロパティの値でソートし、ASCは昇順、DESCは降順指定、省略すると昇順でソートします。
		 * </p>
		 * <p>
		 * 比較関数を指定する場合、以下の例のように実装してください。
		 * </p>
		 *
		 * <pre class="sh_javascript">
		 * query.orderBy(function(a, b) {
		 * 	// idを数値で評価して降順にする
		 * 		// 引数はそれぞれデータアイテム。第1引数を先にする場合は正の値、第2引数を先にする場合は負の値を返す
		 * 		return parseInt(b.get('id')) - parseInt(a.get('id'));
		 * 	});
		 * </pre>
		 *
		 * @memberOf Query
		 * @param {String|Function}
		 * @returns {Query}
		 */
		orderBy: function(orderByClause) {
			// compareFuncの作成
			if (isFunction(orderByClause)) {
				this._compareFunction = orderByClause;
				this.result.sort(this._compareFunction);
				return this;
			}
			if (!orderByClause || !isString(orderByClause)) {
				// エラー
				throwFwError(ERR_CODE_ORDER_BY_CLAUSE, [orderByClause]);
			}
			var tmp = orderByClause.split(' ');
			var key = $.trim(tmp[0]);

			// keyがschemaにあるかどうかチェックする
			var schema = this._model.schema;
			if (!schema.hasOwnProperty(key)) {
				//スキーマに存在しないプロパティはgetできない（プログラムのミスがすぐわかるように例外を送出）
				throwFwError(ERR_CODE_ORDER_BY_KEY, [this._model.name, key]);
			}

			var order = tmp[1] ? $.trim(tmp[1].toUpperCase()) : 'ASC';
			if (order === 'DESC') {
				this._compareFunction = createDescCompareFunction(key);
			} else if (order === 'ASC') {
				this._compareFunction = createAscCompareFunction(key);
			} else {
				// エラー
				throwFwError(ERR_CODE_ORDER_BY_CLAUSE, [orderByClause]);
			}
			// ライブクエリならソートする
			if (this._isLive) {
				this.result.sort(this._compareFunction);
			}
			return this;
		}
	});

	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	/**
	 * Queryクラスを作成して返します
	 *
	 * @private
	 * @returns {Query} 検索を行うQueryクラスを返します
	 */
	function createQuery() {
		return new Query(this);
	}

	// =============================
	// Expose to window
	// =============================

	// h5internalにqueryを公開
	h5internal.data = {
		createQuery: createQuery
	};
})();
/* ------ h5.core.data ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/**
	 * <a href="#createSequence">createSequence()</a>で使用するための、型指定定数。
	 * <p>
	 * 文字列型を表します。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @type {Integer}
	 */
	var SEQ_STRING = 1;

	/**
	 * <a href="#createSequence">createSequence()</a>で使用するための、型指定定数
	 * <p>
	 * 数値型を表します。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @type {Integer}
	 */
	var SEQ_INT = 2;

	var ID_TYPE_STRING = 'string';
	var ID_TYPE_INT = 'number';

	// -------------------------------
	// エラーコード
	// -------------------------------
	/** マネージャ名が不正 */
	var ERR_CODE_INVALID_MANAGER_NAME = 15000;

	/** ディスプリプタが不正 */
	var ERR_CODE_INVALID_DESCRIPTOR = 15001;

	/** データアイテムの生成にはIDが必要なのに指定されていない */
	var ERR_CODE_NO_ID = 15002;

	/** DataItem.set()でidをセットすることはできない */
	var ERR_CODE_CANNOT_SET_ID = 15003;

	/** createModelに渡された配列内のディスクリプタ同士でtypeやbaseによる依存関係が循環参照している */
	var ERR_CODE_DESCRIPTOR_CIRCULAR_REF = 15004;

	/** DataModelに属していないDataItem、またはDataManagerに属していないDataModelのDataItemは変更できない */
	var ERR_CODE_CANNOT_CHANGE_REMOVED_ITEM = 15005;

	/** DataManagerに属していないDataModelで、create/remove/変更できない */
	var ERR_CODE_CANNOT_CHANGE_DROPPED_MODEL = 15006;

	/** createの引数がオブジェクトでも配列でもない */
	var ERR_CODE_INVALID_CREATE_ARGS = 15007;

	/** スキーマオブジェクトが指定されていない。 */
	var ERR_CODE_REQUIRE_SCHEMA = 15008;

	/** スキーマが不正 */
	var ERR_CODE_INVALID_SCHEMA = 15009;

	/** ObservableArrray#copyFromの引数が不正 */
	var ERR_CODE_INVALID_COPYFROM_ARGUMENT = 15010;

	/** スキーマ違反の値がセットされた */
	var ERR_CODE_INVALID_ITEM_VALUE = 15011;

	/** 依存項目にセットされた */
	var ERR_CODE_DEPEND_PROPERTY = 15012;

	/** ObservableItemでスキーマで定義されていない値にセットされた */
	var ERR_CODE_CANNOT_SET_NOT_DEFINED_PROPERTY = 15013;

	/** schemaに定義されていないプロパティを取得した */
	var ERR_CODE_CANNOT_GET_NOT_DEFINED_PROPERTY = 15014;

	/** depend.calcが制約を満たさない値を返している */
	var ERR_CODE_CALC_RETURNED_INVALID_VALUE = 15016;

	// ----------------------------------------------------------
	// ディスクリプタのエラーコード(detailに入れるメッセージID)
	// ----------------------------------------------------------
	/** ディスクリプタがオブジェクトでない */
	var DESC_ERR_DETAIL_NOT_OBJECT = 15900;

	/** nameが正しく設定されていない */
	var DESC_ERR_DETAIL_INVALID_NAME = 15901;

	/** baseの指定が不正 */
	var DESC_ERR_DETAIL_INVALID_BASE = 15902;

	/** baseに指定されたデータモデルが存在しない */
	var DESC_ERR_DETAIL_NO_EXIST_BASE = 15903;

	/** schemaもbaseも指定されていない */
	var DESC_ERR_DETAIL_NO_SCHEMA = 15904;

	/** schemaがオブジェクトでない */
	var DESC_ERR_DETAIL_SCHEMA_IS_NOT_OBJECT = 6;

	// ---------------------------------------------------
	// スキーマのエラーコード(detailに入れるメッセージID)
	// ---------------------------------------------------

	/** ID指定されたプロパティが重複している */
	var SCHEMA_ERR_DETAIL_DUPLICATED_ID = 15800;

	/** ID指定されたプロパティがない */
	var SCHEMA_ERR_DETAIL_NO_ID = 15801;

	/** プロパティ名が不正 */
	var SCHEMA_ERR_DETAIL_INVALID_PROPERTY_NAME = 15802;

	/** id指定されたプロパティにdependが指定されている */
	var SCHEMA_ERR_DETAIL_ID_DEPEND = 15803;

	/** depend.onに指定されたプロパティが存在しない */
	var SCHEMA_ERR_DETAIL_DEPEND_ON = 15804;

	/** depend.calcに関数が指定されていない */
	var SCHEMA_ERR_DETAIL_DEPEND_CALC = 15805;

	/** typeに文字列が指定されていない */
	var SCHEMA_ERR_DETAIL_INVALID_TYPE = 15806;

	/** type文字列が不正 */
	var SCHEMA_ERR_DETAIL_TYPE = 15807;

	/** typeに指定されたデータモデルが存在しない */
	var SCHEMA_ERR_DETAIL_TYPE_DATAMODEL = 15808;

	/** type:enumなのにenumValueが指定されていない */
	var SCHEMA_ERR_DETAIL_TYPE_ENUM_NO_ENUMVALUE = 15809;

	/** constraintにオブジェクトが指定されていない */
	var SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT = 15810;

	/** constraint.notNullの指定が不正 */
	var SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_NOTNULL_NOTEMPTY = 15811;

	/** min-maxに数値が入力されなかった時のエラー */
	var SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_MIN_MAX = 15812;

	/** typeがinteger,numberじゃないのにconstraint.min/max を指定されたときのエラー */
	var SCHEMA_ERR_DETAIL_TYPE_CONSTRAINT = 15813;

	/** constraint.patternが正規表現じゃない */
	var SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_PATTERN = 15814;

	/** minLength/maxLengthに0以上の整数値以外の値が渡された */
	var SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_MINLENGTH_MAXLENGTH = 15815;

	/** constraintの指定に矛盾がある場合(mix > maxなど) */
	var SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT = 15816;

	/** typeがenumでないのにenumValueが指定されている */
	var SCHEMA_ERR_DETAIL_ENUMVALUE_TYPE = 15817;

	/** enumValueが配列でない、または空配列 */
	var SCHEMA_ERR_DETAIL_INVALID_ENUMVALUE = 15818;

	/** id項目にdefaultValueが設定されている */
	var SCHEMA_ERR_DETAIL_DEFAULTVALUE_ID = 15819;

	/** defaultValueに設定された値がtype,constraintに指定された条件を満たしていない */
	var SCHEMA_ERR_DETAIL_INVALIDATE_DEFAULTVALUE = 15820;

	/** ID項目のconstraintに不正な指定がある */
	var SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT_ID = 15821;

	/** defaultValue指定されたプロパティにdependが指定されている */
	var SCHEMA_ERR_DETAIL_DEFAULTVALUE_DEPEND = 15822;

	/** dependの依存関係が循環している */
	var SCHEMA_ERR_DETAIL_DEPEND_CIRCULAR_REF = 15823;

	/** ID項目に'string','integer'以外のタイプが指定された */
	var SCHEMA_ERR_ID_TYPE = 15824;

	/**
	 * データモデルは存在しないことを表す文字列(n/a) エラーメッセージで使用。
	 */
	var NOT_AVAILABLE = 'n/a';

	/**
	 * イベント名
	 */
	var EVENT_ITEMS_CHANGE = 'itemsChange';

	/**
	 * データアイテム、データモデル変更時のイベントログをストックしておくためのタイプ
	 */
	var UPDATE_LOG_TYPE_CREATE = 1;
	var UPDATE_LOG_TYPE_CHANGE = 2;
	var UPDATE_LOG_TYPE_REMOVE = 3;

	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.core.data');
	/* del begin */
	// 詳細エラーメッセージを作成する関数をカスタムフォーマッタに登録
	function formatDescriptorError(code, msgSrc, msgParam, detail) {
		var msg = h5.u.str.format.apply(null, [msgSrc].concat(msgParam)) + ' 詳細：';

		for (var i = 0, len = detail.length; i < len; i++) {
			if (i !== 0) {
				msg += ', ';
			}

			msg += (i + 1) + ':';

			var reason = detail[i];
			if (reason.message) {
				msg += reason.message;
			} else {
				msg += 'code=' + reason.code;
			}
		}

		return msg;
	}
	addFwErrorCustomFormatter(ERR_CODE_INVALID_DESCRIPTOR, formatDescriptorError);
	addFwErrorCustomFormatter(ERR_CODE_INVALID_SCHEMA, formatDescriptorError);

	/**
	 * 各エラーコードに対応するメッセージ
	 */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_REQUIRE_SCHEMA] = 'スキーマオブジェクトが指定されていません。';
	errMsgMap[ERR_CODE_INVALID_SCHEMA] = 'スキーマ定義オブジェクトが不正です。';
	errMsgMap[ERR_CODE_INVALID_ITEM_VALUE] = 'Itemのsetterに渡された値がスキーマで指定された型・制約に違反しています。データモデル={0} 違反したプロパティ={1}';
	errMsgMap[ERR_CODE_DEPEND_PROPERTY] = 'depend指定されているプロパティに値をセットすることはできません。データモデル={0} 違反したプロパティ={1}';
	errMsgMap[ERR_CODE_CANNOT_SET_NOT_DEFINED_PROPERTY] = 'スキーマに定義されていないプロパティに値をセットすることはできません。データモデル={0} 違反したプロパティ={1}';
	errMsgMap[ERR_CODE_CANNOT_GET_NOT_DEFINED_PROPERTY] = 'スキーマに定義されていないプロパティは取得できません。データモデル={0} 違反したプロパティ={1}';
	errMsgMap[ERR_CODE_CALC_RETURNED_INVALID_VALUE] = 'calcで返却された値が、スキーマで指定された型・制約に違反しています。データモデル={0} プロパティ={1} 返却値={2}';
	errMsgMap[ERR_CODE_INVALID_COPYFROM_ARGUMENT] = 'copyFromの引数が不正です。配列を指定してください。引数位置={0}、値={1}';
	errMsgMap[ERR_CODE_INVALID_MANAGER_NAME] = 'マネージャ名が不正です。識別子として有効な文字列を指定してください。';
	errMsgMap[ERR_CODE_NO_ID] = 'データアイテムの生成にはID項目の値の設定が必須です。データモデル={0} IDプロパティ={1}';
	errMsgMap[ERR_CODE_INVALID_DESCRIPTOR] = 'データモデルディスクリプタにエラーがあります。';
	errMsgMap[ERR_CODE_CANNOT_SET_ID] = 'id指定されたプロパティを変更することはできません。データモデル={0} プロパティ={1}';
	errMsgMap[ERR_CODE_DESCRIPTOR_CIRCULAR_REF] = 'Datamaneger.createModelに渡された配列内のディスクリプタについて、baseやtypeによる依存関係が循環参照しています。';
	errMsgMap[ERR_CODE_CANNOT_CHANGE_REMOVED_ITEM] = 'DataModelに属していないDataItem、またはDataManagerに属していないDataModelのDataItemの中身は変更できません。データアイテムID={0}, メソッド={1}';
	errMsgMap[ERR_CODE_CANNOT_CHANGE_DROPPED_MODEL] = 'DataManagerに属していないDataModelの中身は変更できません。モデル名={0}, メソッド={1}';
	errMsgMap[ERR_CODE_INVALID_CREATE_ARGS] = 'DataModel.createに渡された引数が不正です。オブジェクトまたは、配列を指定してください。';

	// メッセージの登録
	addFwErrorCodeMap(errMsgMap);

	// detailに格納するメッセージ
	var DESCRIPTOR_VALIDATION_ERROR_MSGS = {};
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_DUPLICATED_ID] = 'ID指定されているプロパティが複数あります。ID指定は1つのプロパティのみに指定してください。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_NO_ID] = 'ID指定されているプロパティがありません。ID指定は必須です。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_PROPERTY_NAME] = '{0}をプロパティ名に指定できません。半角英数字,_,$ で構成される文字列で、先頭は数字以外である必要があります。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_ID_DEPEND] = '"{0}"プロパティの定義にエラーがあります。id指定されたプロパティにdependを指定することはできません。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_DEPEND_ON] = '"{0}"プロパティプロパティの定義にエラーがあります。depend.onに指定されたプロパティが存在しません。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_DEPEND_CALC] = '"{0}"プロパティプロパティの定義にエラーがあります。depend.calcには関数を指定する必要があります';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_TYPE] = '"{0}"プロパティプロパティの定義にエラーがあります。typeは文字列で指定して下さい。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_TYPE] = 'プロパティの定義にエラーがあります。typeに指定された文字列が不正です "{1}"';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_TYPE_DATAMODEL] = '"{0}"プロパティの定義にエラーがあります。 typeに指定されたデータモデル"{1}"は存在しません';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_TYPE_ENUM_NO_ENUMVALUE] = '"{0}"プロパティの定義にエラーがあります。 タイプにenumを指定する場合はenumValueも指定する必要があります';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT] = '"{0}"プロパティの定義にエラーがあります。 constraintはオブジェクトで指定してください';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_NOTNULL_NOTEMPTY] = '"{0}"プロパティの定義にエラーがあります。 constraint.{1} の指定が不正です。trueまたはfalseで指定してください。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_MIN_MAX] = '"{0}"プロパティの定義にエラーがあります。 constraint.{1} は、数値で指定してください。typeにintegerを指定している場合は整数値で指定する必要があります';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_TYPE_CONSTRAINT] = '"{0}"プロパティの定義にエラーがあります。 constraint.{1} は、type:{2}の項目に対して指定することはできません。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_PATTERN] = '"{0}"プロパティ constraint.{1}は正規表現オブジェクトで指定してください。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_MINLENGTH_MAXLENGTH] = '"{0}"プロパティの定義にエラーがあります。 constraint.{1}には正の整数を指定してください';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT] = '"{0}"プロパティの定義にエラーがあります。 constraintに矛盾する指定があります。{1},{2}';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_ENUMVALUE_TYPE] = '"{0}"プロパティの定義にエラーがあります。 enumValueはtypeに"enum"またはその配列が指定されている場合のみ指定可能です';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_ENUMVALUE] = '"{0}"プロパティの定義にエラーがあります。 enumValueはnull,undefinedを含まない長さ1以上の配列を指定してください';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_DEFAULTVALUE_ID] = '"{0}"プロパティの定義にエラーがあります。id指定した項目にdefaultValueを設定することはできません';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALIDATE_DEFAULTVALUE] = '"{0}"プロパティのdefaultValueに設定された値"{1}"は、typeまたはconstraintに定義された条件を満たしていません';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT_ID] = '"{0}"プロパティの定義にエラーがあります。id指定された項目にconstraint.{1}:{2}を指定することはできません';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_DEFAULTVALUE_DEPEND] = '"{0}"プロパティの定義にエラーがあります。dependが指定された項目にdefaultValueを指定することはできません。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_DEPEND_CIRCULAR_REF] = '"{0}"プロパティの定義にエラーがあります。depend.onに指定されたプロパティの依存関係が循環しています';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[DESC_ERR_DETAIL_NOT_OBJECT] = 'DataModelのディスクリプタにはオブジェクトを指定してください。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[DESC_ERR_DETAIL_INVALID_NAME] = 'データモデル名が不正です。使用できる文字は、半角英数字、_、$、のみで、先頭は数字以外である必要があります。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[DESC_ERR_DETAIL_INVALID_BASE] = 'baseの指定が不正です。指定する場合は、継承したいデータモデル名の先頭に"@"を付けた文字列を指定してください。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[DESC_ERR_DETAIL_NO_EXIST_BASE] = 'baseの指定が不正です。指定されたデータモデル{0}は存在しません。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[DESC_ERR_DETAIL_NO_SCHEMA] = 'schemaの指定が不正です。baseの指定がない場合はschemaの指定は必須です。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[DESC_ERR_DETAIL_SCHEMA_IS_NOT_OBJECT] = 'schemaの指定が不正です。schemaはオブジェクトで指定してください。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_ID_TYPE] = '"{0}"プロパティの定義にエラーがあります。id指定されたプロパティには"string","integer"以外のtypeを指定することはできません。';

	// ログメッセージ
	var MSG_ERROR_DUP_REGISTER = '同じ名前のデータモデルを登録しようとしました。同名のデータモデルの2度目以降の登録は無視されます。マネージャ名は {0}, 登録しようとしたデータモデル名は {1} です。';

	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	/**
	 * DataItem, ObservableItem共通
	 */
	var itemProto = {
		/**
		 * 指定されたキーのプロパティの値を取得します。
		 * <p>
		 * 引数にプロパティ名を指定すると、アイテムが持つそのプロパティの値を返します。
		 * </p>
		 * <p>
		 * 引数の指定がない場合は、{id: '001', value: 'hoge'} のような、そのデータアイテムが持つ値を格納したオブジェクトを返します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataItem
		 * @param {String} [key] プロパティキー。指定のない場合は、アイテムの持つプロパティ名をキーに、そのプロパティの値を持つオブジェクトを返します。
		 * @returns Any 指定されたプロパティの値。引数なしの場合はプロパティキーと値を持つオブジェクト。
		 */
		get: function(key) {
			if (arguments.length === 0) {
				return $.extend({}, this._values);
			}

			// DataItemの場合はモデルから、ObsItemの場合はObsItemのインスタンスからschemaを取得
			var model = this._model;
			var schema = model ? model.schema : this.schema;
			if (!schema.hasOwnProperty(key)) {
				//スキーマに存在しないプロパティはgetできない（プログラムのミスがすぐわかるように例外を送出）
				throwFwError(ERR_CODE_CANNOT_GET_NOT_DEFINED_PROPERTY, [
						model ? model.name : NOT_AVAILABLE, key]);
			}

			return getValue(this, key);
		},

		/**
		 * 指定されたキーのプロパティに値をセットします。
		 * <p>
		 * 複数のプロパティに対して値を一度にセットしたい場合は、{ キー1: 値1, キー2: 値2, ... }という構造をもつオブジェクトを1つだけ渡してください。
		 * </p>
		 * <p>
		 * 1つのプロパティに対して値をセットする場合は、 item.set(key, value); のように2つの引数でキーと値を個別に渡すこともできます。
		 * </p>
		 * <p>
		 * このメソッドを呼ぶと、再計算が必要と判断された依存プロパティは自動的に再計算されます。
		 * 再計算によるパフォーマンス劣化を最小限にするには、1つのアイテムへのset()の呼び出しはできるだけ少なくする
		 * （引数をオブジェクト形式にして一度に複数のプロパティをセットし、呼び出し回数を最小限にする）ようにしてください。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataItem
		 * @param {Any} var_args 複数のキー・値のペアからなるオブジェクト、または1組の(キー, 値)を2つの引数で取ります。
		 */
		set: function(var_args) {
			//引数はオブジェクト1つ、または(key, value)で呼び出せる
			var valueObj = var_args;
			if (arguments.length === 2) {
				valueObj = {};
				valueObj[arguments[0]] = arguments[1];
			}

			// データモデルから作られたアイテムなら、アイテムがモデルに属しているか、モデルがマネージャに属しているかのチェック
			// アイテムがモデルに属していない又は、アイテムが属しているモデルがマネージャに属していないならエラー
			var model = this._model;
			if (model && (this._isRemoved || !model._manager)) {
				throwFwError(ERR_CODE_CANNOT_CHANGE_REMOVED_ITEM, [
						getValue(this, this._model._idKey), 'set'], this);
			}

			// バリデーション
			if (model) {
				// idの変更がされてるかどうかチェック
				if ((model._idKey in valueObj)
						&& (valueObj[model._idKey] !== getValue(this, model._idKey))) {
					//IDの変更は禁止
					throwFwError(ERR_CODE_CANNOT_SET_ID, [model.name, this._idKey]);
				}
				// スキーマの条件を満たすかどうかチェック

				// DataItemの場合はモデルから、ObsItemの場合はObsItemのインスタンスからschemaを取得
				validateValueObj(model.schema, model._schemaInfo._validateItemValue, valueObj,
						model);
			} else {
				// モデルが無い場合はthisはObserbableItem。(モデルが無いDataItemはチェック済みのため)
				// ObsItem.validateを呼んでスキーマの条件を満たすかどうかチェック
				var error = this.validate(valueObj);
				if (error) {
					throw error;
				}
			}

			var event = null;
			// updateセッション中かどうか。updateセッション中ならこのsetの中ではbeginUpdateもendUpdateしない
			// updateセッション中でなければ、begin-endで囲って、最後にイベントが発火するようにする
			// このbegin-endの間にObsArrayでイベントが上がっても(内部でcopyFromを使ったりなど)、itemにイベントは上がらない
			var isAlreadyInUpdate = model ? model._manager.isInUpdate() : false;
			if (model && !isAlreadyInUpdate) {
				model._manager.beginUpdate();
			}
			// isInSetフラグを立てて、set内の変更でObsAry.copyFromを呼んだ時にイベントが上がらないようにする
			this._isInSet = true;
			event = itemSetter(this, valueObj);
			this._isInSet = false;

			if (model) {
				// データアイテムの場合は、モデルにイベントを渡す
				if (event) {
					// 更新した値があればChangeLogを追記
					addUpdateChangeLog(model, event);
				}
				// endUpdateを呼んでイベントを発火
				if (!isAlreadyInUpdate) {
					model._manager.endUpdate();
				}
			} else if (event) {
				// ObservableItemなら即発火
				this.dispatchEvent(event);
			}
		},

		/**
		 * type:[]であるプロパティについて、最後にセットされた値がnullかどうかを返します。
		 * <p>
		 * type:[]としたプロパティは常にObservableArrayインスタンスがセットされており、set('array', null);
		 * と呼ぶと空配列を渡した場合と同じになります。
		 * </p>
		 * <p>
		 * そのため、「実際にはnullをセットしていた（item.set('array', null)）」場合と「空配列をセットしていた（item.set('array,'
		 * [])）」場合を区別したい場合にこのメソッドを使ってください。
		 * </p>
		 * <p>
		 * データアイテムを生成した直後は、スキーマにおいてdefaultValueを書いていないまたはnullをセットした場合はtrue、それ以外の場合はfalseを返します。
		 * </p>
		 * <p>
		 * なお、引数に配列指定していないプロパティを渡した場合は、現在の値がnullかどうかを返します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataItem
		 * @param {String} key プロパティ名
		 * @returns {Boolean} 現在指定したプロパティにセットされているのがnullかどうか
		 */
		regardAsNull: function(key) {
			if (this._isArrayProp(key)) {
				return this._nullProps[key] === true;
			}
			return getValue(this, key) === null;
		},

		/**
		 * 指定されたプロパティがtype:[]かどうかを返します。（type:anyでObservableArrayが入っている場合とtype:[]で最初から
		 * ObservableArrayが入っている場合を区別するため
		 *
		 * @private
		 * @memberOf DataItem
		 * @returns {Boolean} 指定されたプロパティがtype:[]なプロパティかどうか
		 */
		_isArrayProp: function(prop) {
			// DataItemの場合はモデルから、ObsItemの場合はObsItemのインスタンスからschemaを取得
			var schema = this._model ? this._model.schema : this.schema;
			// DataItemの場合はモデルから、ObsItemの場合はObsItemのインスタンスからschemaを取得
			if (schema[prop] && schema[prop].type && schema[prop].type.indexOf('[]') > -1) {
				//Bindingにおいて比較的頻繁に使われるので、高速化も検討する
				return true;
			}
			return false;
		}
	};
	// =============================
	// Functions
	// =============================
	//========================================================
	//
	// バリデーション関係コードここから
	//
	//========================================================
	/**
	 * ObservableItem, DataItem, DataModelから計算済みのschemaオブジェクトを取得する
	 *
	 * @private
	 * @param {ObservableItem|DataItem|DataModel}
	 */
	function getSchema(itemOrModel) {
		// ObsItem,DataModelはschemaプロパティを持つが、DataItemはschemaを持たないので、modelから取得して返す
		return itemOrModel.schema || itemOrModel._model.schema;
	}

	/**
	 * schemaオブジェクトのtype指定の文字列を、パースした結果を返す。 正しくパースできなかった場合は空オブジェクトを返す。
	 *
	 * @private
	 * @param {String} type type指定文字列。文字列以外が渡された場合は空オブジェクトを返す
	 * @returns {Object} typeをパースした結果オブジェクト。
	 *          elmType:タイプから配列部分を除いた文字列。dataModel:データモデル名。dimension:配列の深さ(配列指定でない場合は0)
	 */
	function getTypeObjFromString(type) {
		// マッチ結果から、データモデル指定の場合と配列の場合をチェックする
		// "string[]"のとき、matched = ["string[]", "string", undefined, "[]", "[]"]
		// "@DataModel"のとき、matched = ["@DataModel", "@DataModel", "DataModel", "", undefined]
		var matched = type && isString(type) ? type
				.match(/^(string|number|integer|boolean|any|enum|@(.+?))((\[\]){0,1})$/) : null;
		return matched ? {
			elmType: matched[1],
			dataModel: matched[2],
			dimension: matched[3] ? 1 : 0
		} : {};
	}

	/**
	 * dependの循環参照をチェックする関数 循環参照するならtrueを返す
	 *
	 * @private
	 * @param {String} prop map[prop]から辿って行って調べる。
	 * @param {Object} map 依存関係をマップしたオブジェクト。{prop1: ['prop2','prop3'], prop2: ['prop3']}
	 *            のような構造で依存関係を表したオブジェクト
	 * @returns {Boolean} 循環参照しているかどうか
	 */
	function checkDependCircularRef(prop, map) {
		return (function checkCircular(p, ancestors) {
			if (!map[p]) {
				return false;
			}
			for (var i = 0, l = map[p].length; i < l; i++) {
				if ($.inArray(map[p][i], ancestors) > -1
						|| checkCircular(map[p][i], ancestors.concat([p]))) {
					return true;
				}
			}
			return false;
		})(prop, []);
	}

	/**
	 * 引数がNaNかどうか判定する。isNaNとは違い、例えば文字列はNaNではないのでfalseとする
	 *
	 * @private
	 * @param {Any} val 判定する値
	 * @returns {Boolean} 引数がNaNかどうか
	 */
	function isStrictNaN(val) {
		return typeof val === 'number' && isNaN(val);
	}

	/**
	 * 引数を2つ取り、両方ともisStrictNaNかどうか判定する
	 *
	 * @private
	 * @param {Any} val1 判定する値
	 * @param {Any} val2 判定する値
	 * @returns {Boolean} 引数が2つともNaNかどうか
	 */
	function isBothStrictNaN(val1, val2) {
		return isStrictNaN(val1) && isStrictNaN(val2);
	}

	/**
	 * type:'number' 指定のプロパティに代入できるかのチェック null,undefined,NaN,parseFloatしてNaNにならないもの
	 * に当てはまる引数についてtrueを返す
	 *
	 * @private
	 * @param {Any} val 判定する値
	 * @param {Boolean} isStrict 厳密に判定するかどうか。isStrict === trueなら型変換可能でも型が違えばfalseを返す
	 * @returns {Boolean} type:'number'指定のプロパティに代入可能か
	 */
	function isNumberValue(val, isStrict) {
		// nullまたはundefinedはtrue
		// NaNを直接入れた場合はtrue
		// new Number() で生成したオブジェクトはtrue
		// 文字列の場合は、[±(数字)(.数字)]で構成されている文字列ならOKにする
		// ※ parseFloatよりも厳しいチェックにしている。
		// "1.2", "+1.2", "1", ".2", "-.2" はOK。
		// "12.3px"、"12.3.4"、"123.", [12.3, 4] はいずれもparseFloatできるが、ここではNG。
		return val == null
				|| isStrictNaN(val)
				|| typeof val === 'number'
				|| (!isStrict && (val instanceof Number || !!((isString(val) || val instanceof String) && !!val
						.match(/^[+\-]{0,1}[0-9]*\.{0,1}[0-9]+$/))));
	}

	/**
	 * type:'integer' 指定のプロパティに代入できるかのチェック null,undefined,parseFloatとparsFloatの結果が同じもの(NaNは除く)
	 * に当てはまる引数についてtrueを返す
	 *
	 * @private
	 * @param {Any} val 判定する値
	 * @param {Boolean} isStrict 厳密に判定するかどうか。isStrict === trueなら型変換可能でも型が違えばfalseを返す
	 * @returns {Boolean} type:'integer'指定のプロパティに代入可能か
	 */
	function isIntegerValue(val, isStrict) {
		// parseIntとparseFloatの結果が同じかどうかで整数値かどうかの判定をする
		// typeofが'nubmer'または、new Number()で生成したオブジェクトで、parseFloatとparseIntの結果が同じならtrue
		// NaN, Infinity, -Infinityはfalseを返す(parseInt(Infinity)はNaNであるので、InfinityはIntじゃない扱いにする
		// 文字列の場合は、[±数字]で構成されている文字列ならOKにする
		// ※ parseIntよりも厳しいチェックにしている。"12px"、"12.3"、[12,3] はいずれもparseIntできるが、ここではNG。
		return val == null
				|| (typeof val === 'number' && parseInt(val) === val)
				|| (!isStrict && (val instanceof Number && parseInt(val) === parseFloat(val) || (typeof val === 'string' || val instanceof String)
						&& !!val.match(/^[+\-]{0,1}[0-9]+$/)));
	}

	/**
	 * ラッパークラスをunboxする 配列が渡されたら、配列の中身をunboxする
	 *
	 * @private
	 * @param v {Any}
	 * @returns unboxしたもの
	 */
	function unbox(v) {
		if (isArray(v)) {
			var ary = v.slice(0);
			for (var i = 0, l = ary.length; i < l; i++) {
				// aryalueOfメソッドのあるオブジェクトならその値を入れる
				ary[i] = ary[i] && typeof ary[i] === 'object' ? ary[i] && ary[i].valueOf
						&& ary[i].valueOf() : ary[i];
			}
			return ary;
		}
		return v && typeof v === 'object' && v.valueOf ? v.valueOf() : v;
	}


	/**
	 * type:'string' 指定のプロパティに代入できるかのチェック
	 *
	 * @private
	 * @param {Any} val 判定する値
	 * @param {Boolean} isStrict 厳密に判定するかどうか。isStrict === trueなら型変換可能でも型が違えばfalseを返す
	 * @returns {Boolean} type:'string'指定のプロパティに代入可能か
	 */
	function isStringValue(val, isStrict) {
		return !!(val == null || isString(val) || (!isStrict && val instanceof String));
	}

	/**
	 * type:'boolean' 指定のプロパティに代入できるかのチェック
	 *
	 * @private
	 * @param {Any} val 判定する値
	 * @param {Boolean} isStrict 厳密に判定するかどうか。isStrict === trueなら型変換可能でも型が違えばfalseを返す
	 * @returns {Boolean} type:'boolean'指定のプロパティに代入可能か
	 */
	function isBooleanValue(val, isStrict) {
		return val == null || typeof val === 'boolean' || (!isStrict && val instanceof Boolean);
	}

	/**
	 * type:'enum' 指定のプロパティに代入できるかのチェック
	 *
	 * @private
	 * @param {Any} val 判定する値
	 * @param {Array} enumValue 列挙されている値の配列
	 * @returns {Boolean} type:'enum'指定のプロパティに代入可能か
	 */
	function isEnumValue(v, enumValue) {
		if (isStrictNaN(v)) {
			// NaN の時は、NaN===NaNにならない(inArrayでも判定できない)ので、enumValueの中身を見て判定する
			for (var i = 0, l = enumValue.length; i < l; i++) {
				if (isStrictNaN(enumValue[i])) {
					return true;
				}
			}
			return false;
		}
		return v === null || $.inArray(v, enumValue) > -1;
	}

	/**
	 * データモデルのディスクリプタとして正しいオブジェクトかどうかチェックする。 正しくない場合はエラーを投げる。
	 *
	 * @private
	 * @param {Object} descriptor オブジェクト
	 * @param {Object} DataManagerオブジェクト
	 * @param {Boolean} stopOnErro エラーが発生した時に、即座にreturnするかどうか
	 */
	function validateDescriptor(descriptor, manager, stopOnError) {
		var errorReason = [];

		function pushErrorReason(/* var_args */) {
			errorReason.push(createItemDescErrorReason.call(this, arguments));
			if (stopOnError) {
				// エラーを投げてチェック処理を終了する
				throw null;
			}
		}

		// try-catchで囲うことで、必ずERR_CODE_INVALID_DESCRIPTORエラーを投げられるようにしている。
		// (stopOnErrorがfalseで、予期しない箇所でエラーが出たとしてもERR_CODE_INVALID_DESCRIPTORエラーを投げる。)
		try {
			// descriptorがオブジェクトかどうか
			if (!$.isPlainObject(descriptor)) {
				// descriptorがオブジェクトじゃなかったら、これ以上チェックしようがないので、stopOnErrorの値に関わらずreturnする
				pushErrorReason(DESC_ERR_DETAIL_NOT_OBJECT);
				throw null;
			}

			// nameのチェック
			if (!isValidNamespaceIdentifier(descriptor.name)) {
				// 識別子として不適切な文字列が指定されていたらエラー
				pushErrorReason(DESC_ERR_DETAIL_INVALID_NAME);
			}

			// baseのチェック
			var base = descriptor.base;
			var baseSchema = null;
			if (base != null) {
				// nullまたはundefinedならチェックしない
				if (!isString(base) || base.indexOf('@') !== 0) {
					// @で始まる文字列（base.indexOf('@')が0）でないならエラー
					pushErrorReason(DESC_ERR_DETAIL_INVALID_BASE);
				} else {
					var baseName = base.substring(1);
					var baseModel = manager.models[baseName];
					if (!baseModel) {
						// 指定されたモデルが存在しないならエラー
						pushErrorReason(DESC_ERR_DETAIL_NO_EXIST_BASE, baseName);
					} else {
						baseSchema = manager.models[baseName].schema;
					}
				}
			}

			// schemaのチェック
			// baseSchemaがないのに、schemaが指定されていなかったらエラー
			var schema = descriptor.schema;
			if (!baseSchema && schema == null) {
				pushErrorReason(DESC_ERR_DETAIL_NO_SCHEMA);
			}

			// schemaが指定されていて、オブジェクトでないならエラー
			if (!baseSchema && !$.isPlainObject(schema)) {
				pushErrorReason(DESC_ERR_DETAIL_SCHEMA_IS_NOT_OBJECT);
				// schemaがオブジェクトでなかったら、schemaのチェックのしようがないので、stopOnErrorの値に関わらずエラーを投げる
				throw null;
			}
		} catch (e) {
			throwFwError(ERR_CODE_INVALID_DESCRIPTOR, null, errorReason);
		}
	}

	/**
	 * schemaが正しいかどうか判定する。正しくない場合はエラーを投げる。
	 *
	 * @private
	 * @param {Object} schema schemaオブジェクト。データモデルのディスクリプタに指定されたスキーマなら継承関係は計算済み。
	 * @param {Boolean} [isDataModelSchema]
	 *            データモデルのスキーマかどうか。データモデルのスキーマならidチェックが必要で、type指定に@データモデル指定が可能。
	 * @param {Object} [manager] DataManagerオブジェクト。データモデルのスキーマチェック時には必須。
	 * @param {Boolean} [stopOnError] エラーが発生した時に、即座にreturnするかどうか。(trueなら即座にreturn)
	 */
	function validateSchema(schema, isDataModelSchema, manager, stopOnError) {
		if (typeof schema !== 'object') {
			// schemaがオブジェクトじゃないならエラー
			throwFwError(ERR_CODE_REQUIRE_SCHEMA);
		}

		var errorReason = [];

		function pushErrorReason(/* var_args */) {
			errorReason.push(createItemDescErrorReason.call(this, arguments));
			if (stopOnError) {
				// エラーを投げてチェック処理を終了する
				throw null;
			}
		}

		// try-catchで囲うことで、必ずERR_CODE_INVALID_SCHEMAエラーを投げられるようにしている。
		// (stopOnErrorがfalseで、予期しない箇所でエラーが出たとしてもERR_CODE_INVALID_SCHEMAエラーを投げる。)
		try {
			if (isDataModelSchema) {
				// id指定されている属性が一つだけであることをチェック
				var hasId = false;
				for ( var p in schema) {
					if (schema[p] && schema[p].id === true) {
						if (hasId) {
							pushErrorReason(SCHEMA_ERR_DETAIL_DUPLICATED_ID);
						}
						hasId = true;
					}
				}
				if (!hasId) {
					pushErrorReason(SCHEMA_ERR_DETAIL_NO_ID);
				}
			}

			// 循環参照チェックのため、depend指定されているプロパティが出てきたら覚えておく
			// key: プロパティ名, value: そのプロパティのdepend.onをwrapInArrayしたもの
			var dependencyMap = {};

			/**
			 * dependのチェック
			 * <ul>
			 * <li>defaultValueは指定されていないか
			 * <li>onが指定されているか
			 * <li>onに指定されているプロパティがschema内に存在するか
			 * <li>calcが指定されているか
			 * </ul>
			 *
			 * @param depend
			 */
			function checkDepend(depend) {
				if (depend == null) {
					return;
				}
				// id指定されているならエラー
				if (isId) {
					pushErrorReason(SCHEMA_ERR_DETAIL_ID_DEPEND, schemaProp);
				}

				// defaultValueが指定されているならエラー
				if (propObj.hasOwnProperty('defaultValue')) {
					pushErrorReason(SCHEMA_ERR_DETAIL_DEFAULTVALUE_DEPEND, schemaProp);
				}

				// dependが指定されているなら、onが指定されていること
				if (depend.on == null) {
					pushErrorReason(SCHEMA_ERR_DETAIL_DEPEND_ON, schemaProp);
				} else {
					var onArray = wrapInArray(depend.on);
					for (var i = 0, l = onArray.length; i < l; i++) {
						if (!schema.hasOwnProperty(onArray[i])) {
							pushErrorReason(SCHEMA_ERR_DETAIL_DEPEND_ON, schemaProp);
							break;
						}
					}
				}

				// dependが指定されているなら、calcが指定されていること
				if (typeof depend.calc !== 'function') {
					pushErrorReason(SCHEMA_ERR_DETAIL_DEPEND_CALC, schemaProp);
				}

				// 後の循環参照チェックのため、depend.onを覚えておく
				dependencyMap[schemaProp] = wrapInArray(depend.on);
			}

			/**
			 * typeのチェック
			 * <ul>
			 * <li>typeに指定されている文字列は正しいか
			 * <li>defaultValueとの矛盾はないか
			 * <li>constraintにそのtypeで使えない指定がないか
			 * <li>enumの時は、enumValueが指定されているか
			 * </ul>
			 *
			 * @param type
			 */
			function checkType(type) {
				if (isId && type == null) {
					// id項目で、typeが指定されていない場合は、type:stringにしてチェックする
					type = 'string';
				}
				var typeObj = {};
				if (type == null) {
					return;
				}
				if (!isString(type)) {
					pushErrorReason(SCHEMA_ERR_DETAIL_INVALID_TYPE, schemaProp);
					return;
				}
				if (isId && type !== 'string' && type !== 'integer') {
					// id指定されているプロパティで、string,integer以外だった場合はエラー
					pushErrorReason(SCHEMA_ERR_ID_TYPE, schemaProp);
				}

				// "string", "number[]", "@DataModel"... などの文字列をパースしてオブジェクトを生成する
				// 正しくパースできなかった場合は空オブジェクトが返ってくる
				typeObj = getTypeObjFromString(type);

				if (!typeObj.elmType) {
					// パースできない文字列が指定されていたらエラー
					pushErrorReason(SCHEMA_ERR_DETAIL_TYPE, schemaProp, type);
				} else {
					// データモデルの場合
					if (typeObj.dataModel) {
						if (!isDataModelSchema) {
							// データモデルをタイプに指定できるのはデータモデルのスキーマだけなのでエラー
							pushErrorReason(SCHEMA_ERR_DETAIL_TYPE, schemaProp, typeObj.dataModel);
						}
						if (!manager.models[typeObj.dataModel]) {
							pushErrorReason(SCHEMA_ERR_DETAIL_TYPE_DATAMODEL, schemaProp,
									typeObj.dataModel);
						}
					}

					// enumの場合
					if (typeObj.elmType === 'enum') {
						// enumValueが無ければエラー
						if (propObj.enumValue == null) {
							pushErrorReason(SCHEMA_ERR_DETAIL_TYPE_ENUM_NO_ENUMVALUE, schemaProp);
						}
					}
				}
			}

			/**
			 * constraintのチェック
			 * <ul>
			 * <li>プロパティのチェック
			 * <li>値のチェック
			 * <li>タイプと矛盾していないかのチェック
			 * </ul>
			 *
			 * @param constraint
			 * @param typeObj
			 */
			function checkConstraint(constraint, typeObj) {
				if (constraint == null) {
					return;
				}

				// constraintのチェック
				if (!$.isPlainObject(constraint)) {
					// constraintがオブジェクトではない場合
					pushErrorReason(SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT, schemaProp);
					return;
				}
				for ( var p in constraint) {
					// constraintのプロパティの値とtype指定との整合チェック
					var val = constraint[p];
					if (val == null) {
						continue;
					}
					switch (p) {
					case 'notNull':
						if (val !== true && val !== false) {
							// notNullにtrueまたはfalse以外が指定されていたらエラー
							pushErrorReason(SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_NOTNULL_NOTEMPTY,
									schemaProp, p);
						} else if (isId && !val) {
							// id項目にnotNull:falseが指定されていたらエラー
							pushErrorReason(SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT_ID, schemaProp,
									p, val);
						}
						break;
					case 'min':
					case 'max':
						switch (typeObj.elmType) {
						case 'integer':
							if (isString(val) || !isIntegerValue(val) || isStrictNaN(val)) {
								// 整数値以外、NaNが指定されていたらエラー
								pushErrorReason(SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_MIN_MAX,
										schemaProp, p);
							}
							break;
						case 'number':
							if (isString(val) || isString(val) || !isNumberValue(val)
									|| val === Infinity || val === -Infinity || isStrictNaN(val)) {
								// 整数値以外、NaNが指定されていたらエラー
								pushErrorReason(SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_MIN_MAX,
										schemaProp, p);
							}
							break;
						default:
							// typeの指定とconstraintに不整合があったらエラー
							pushErrorReason(SCHEMA_ERR_DETAIL_TYPE_CONSTRAINT, schemaProp, p,
									typeObj.elmType);
						}
						break;
					case 'minLength':
					case 'maxLength':
						switch (typeObj.elmType) {
						case 'string':
							if (isString(val) || !isIntegerValue(val) || isStrictNaN(val)
									|| val < 0) {
								// typeの指定とconstraintに不整合があったらエラー
								pushErrorReason(
										SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_MINLENGTH_MAXLENGTH,
										schemaProp, p);
							} else if (isId && p === 'maxLength' && val === 0) {
								// id項目にmaxLength: 0 が指定されていたらエラー
								pushErrorReason(SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT_ID,
										schemaProp, p, val);
							}
							break;
						default:
							// type:'string'以外の項目にmaxLength,minLengthが指定されていればエラー
							pushErrorReason(SCHEMA_ERR_DETAIL_TYPE_CONSTRAINT, schemaProp, p,
									typeObj.elmType);
						}
						break;
					case 'notEmpty':
						switch (typeObj.elmType) {
						case 'string':
							if (val !== true && val !== false) {
								// notEmptyにtrue,false以外の指定がされていたらエラー
								pushErrorReason(
										SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_NOTNULL_NOTEMPTY,
										schemaProp, p);
							} else if (isId && !val) {
								// id項目にnotEmpty: false が指定されていたらエラー
								pushErrorReason(SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT_ID,
										schemaProp, p, val);
							}
							break;
						default:
							// type:'string'以外の項目にnotEmptyが指定されていたらエラー
							pushErrorReason(SCHEMA_ERR_DETAIL_TYPE_CONSTRAINT, schemaProp, p,
									typeObj.elmType);
						}
						break;
					case 'pattern':
						switch (typeObj.elmType) {
						case 'string':
							if ($.type(val) !== 'regexp') {
								// patternにRegExpオブジェクト以外のものが指定されていたらエラー
								pushErrorReason(SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_PATTERN,
										schemaProp, p);
							}
							break;
						default:
							// type:'string'以外の項目にpatterが指定されていたらエラー
							pushErrorReason(SCHEMA_ERR_DETAIL_TYPE_CONSTRAINT, schemaProp, p,
									typeObj.elmType);
						}
						break;
					}
				}

				// constraintの中身に矛盾がないかどうかチェック
				if (constraint.notEmpty && constraint.maxLength === 0) {
					// notNullなのにmanLengthが0
					pushErrorReason(SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT, schemaProp, 'notEmpty',
							'maxLength');
				}
				if (constraint.min != null && constraint.max != null
						&& constraint.min > constraint.max) {
					// min > max
					pushErrorReason(SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT, schemaProp, 'min', 'max');
				}
				if (constraint.minLength != null && constraint.maxLength != null
						&& constraint.minLength > constraint.maxLength) {
					// minLength > maxLength
					pushErrorReason(SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT, schemaProp, 'minLength',
							'maxLength');
				}
			}
			/**
			 * enumValueのチェック
			 * <ul>
			 * <li>typeがenumであること
			 * <li>正しい配列が指定されていること
			 * </ul>
			 *
			 * @param constraint
			 * @param typeObj
			 */
			function checkEnumValue(enumValue, typeObj) {
				if (enumValue == null) {
					return;
				}
				if (typeObj.elmType !== 'enum') {
					// type指定がenumでないならエラー
					pushErrorReason(SCHEMA_ERR_DETAIL_ENUMVALUE_TYPE, schemaProp);
				}
				if (!isArray(enumValue) || enumValue.length === 0
						|| $.inArray(null, enumValue) > -1 || $.inArray(undefined, enumValue) > -1) {
					// 配列でない、または空配列、null,undefinedを含む配列ならエラー
					pushErrorReason(SCHEMA_ERR_DETAIL_INVALID_ENUMVALUE, schemaProp);
				}
			}
			/**
			 * defaultValueのチェック
			 * <ul>
			 * <li>id:trueの項目ではないこと
			 * </ul>
			 * <p>
			 * defaultValueの中身は見ない。typeやconstraintの条件を満たしているかのチェックはここでは行わない。
			 * また、depend指定されている項目にdefaultValueが指定されている場合はdependのチェック時にエラーにしている。
			 * </p>
			 */
			function checkDefaultValue(propObj) {
				if (isId && propObj.hasOwnProperty('defaultValue')) {
					// id項目にdefaultValueが設定されていたらエラー
					pushErrorReason(SCHEMA_ERR_DETAIL_DEFAULTVALUE_ID, schemaProp);

				}
			}

			// schemaのそれぞれのプロパティをチェックする
			for ( var schemaProp in schema) {
				// null(またはundefined)がプロパティオブジェクトに指定されていたら、空オブジェクトと同等に扱い、エラーにしない。
				var propObj = schema[schemaProp] == null ? {} : schema[schemaProp];
				// idの時は特別にチェック(idにはdependが指定できない、typeが指定できない等)する項目があるのでそのフラグを立てる。
				// ObservableItemの時はidは関係ないのでfalse
				var isId = isDataModelSchema && !!propObj.id;

				// プロパティ名が適切なものかどうかチェック
				if (!isValidNamespaceIdentifier(schemaProp)) {
					pushErrorReason(SCHEMA_ERR_DETAIL_INVALID_PROPERTY_NAME, schemaProp);
				}

				// dependのチェック
				checkDepend(propObj.depend);

				// typeのチェック
				checkType(propObj.type);

				// typeObjの作成
				var typeObj = {};
				// id項目で、typeが指定されていない場合は、type:stringにしてチェックする
				var type = isId && type == null ? 'string' : propObj.type;
				if (isString(type)) {
					typeObj = getTypeObjFromString(type);
				}

				// constraintのチェック
				checkConstraint(propObj.constraint, typeObj);

				// enumValueのチェック
				checkEnumValue(propObj.enumValue, typeObj);

				// defaultValueのチェック
				checkDefaultValue(propObj);
			}

			// depend.onの循環参照チェック
			// onに指定されているプロパティの定義が正しいかどうかのチェックが終わっているここでチェックする
			// （循環参照チェック以前の、プロパティがあるのか、dependがあるならonがあるか、などのチェックをしなくて済むようにするため）
			// （これ以前のチェックに引っかかっていたら、循環参照のチェックはしない）
			for ( var prop in dependencyMap) {
				if (checkDependCircularRef(prop, dependencyMap)) {
					pushErrorReason(SCHEMA_ERR_DETAIL_DEPEND_CIRCULAR_REF, prop);
				}
			}
		} catch (e) {
			throwFwError(ERR_CODE_INVALID_SCHEMA, null, errorReason);
		}
		return true;
	}

	/**
	 * checkFuncsの条件をdefaultValueが満たすかどうかチェックする
	 *
	 * @private
	 * @param {Object} descriptor descriptor
	 * @param {Object} checkFuncs 各プロパティをキーに、チェックする関数を持つオブジェクト
	 * @param {Boolean} stopOnError defaultValueがチェック関数を満たさない時に、エラーを投げてチェックを中断するかどうか
	 * @returns {Boolean} チェック結果。
	 */
	function validateDefaultValue(schema, checkFuncs, stopOnError) {
		var errorReason = [];
		try {
			for ( var p in schema) {
				var propObj = schema[p];
				if (!propObj
						|| !propObj.hasOwnProperty('defaultValue')
						&& propObj.type
						&& (propObj.type === 'array' || getTypeObjFromString(propObj.type).dimension)) {
					// defaultValueが指定されていないかつ、type指定が配列指定であれば、
					// 初期値は空のOvservableArrayになる。
					// 空のOvservableArrayがチェックに引っかかることはないので、チェック関数でチェックしない。
					continue;
				}

				// defaultValueが指定されていない場合は、ここではチェックしない
				if (!propObj.hasOwnProperty('defaultValue')) {
					continue;
				}
				var defaultValue = propObj.defaultValue;
				if (checkFuncs[p](defaultValue).length) {
					pushErrorReason(SCHEMA_ERR_DETAIL_INVALIDATE_DEFAULTVALUE, p, defaultValue);
				}
			}
			return true;
		} catch (e) {
			throwFwError(ERR_CODE_INVALID_SCHEMA, null, errorReason);
		}
	}

	/**
	 * スキーマのプロパティオブジェクトから、そのプロパティに入る値かどうかをチェックする関数を作る。 # schema:{val:xxxx,val2:....}
	 * のxxxxの部分と、マネージャを引数にとる スキーマのチェックが通ってから呼ばれる前提なので、エラーチェックは行わない。
	 *
	 * @private
	 * @param {Object} propertyObject スキーマのプロパティオブジェクト
	 * @param {Boolean} isDataModel データモデルのチェック関数を作成するかどうか。trueならidチェックを行う。
	 * @param {Object} [manager] そのスキーマを持つモデルが属するマネージャのインスタンス。データモデルのチェックに必要(要らないなら省略可能)
	 * @returns {function} 指定されたスキーマのプロパティに、引数の値が入るかどうかをチェックする関数
	 */
	function createCheckValueBySchemaPropertyObj(propertyObject, isDataModel, manager) {
		// schema{prop:null} のように指定されている場合はpropObjはnullなので、空オブジェクト指定と同等に扱うようにする
		var propObj = propertyObject || {};
		var checkFuncArray = [];
		var elmType = null;
		var dimension = 0;
		var type = propObj.type;
		var constraint = propObj.constraint || {};

		// id:true の場合 type指定がない場合はtype:string,
		// notNull(type:stringならnotEmpty)をtrueにする(データモデルの場合のみ)
		if (isDataModel && propObj.id) {
			type = type || 'string';
			constraint.notNull = true;
			if (type === 'string') {
				constraint.notEmpty = true;
			}
		}
		if (type) {
			// typeに指定された文字列をパースしてオブジェクトに変換
			var typeObj = getTypeObjFromString(type);

			elmType = typeObj.elmType;
			// 配列の次元(0か1のみ)。配列でないなら0
			dimension = typeObj.dimension;

			// type指定を元に値を(配列は考慮せずに)チェックする関数を作成してcheckFuncArrayに追加
			checkFuncArray.push(createTypeCheckFunction(elmType, {
				manager: manager,
				enumValue: propObj.enumValue
			}));
		}
		// constraintを値が満たすかどうかチェックする関数を作成してcheckFuncArrayに追加
		if (constraint) {
			checkFuncArray.push(createConstraintCheckFunction(constraint));
		}
		return createCheckValueByCheckObj({
			checkFuncs: checkFuncArray,
			dimension: dimension
		});
	}

	/**
	 * descriptorからschemaの各プロパティの値をチェックする関数を作成して返す
	 *
	 * @private
	 * @param {Object} schema スキーマオブジェクト
	 * @param {Booelan} isDataModel データモデルのチェック関数を作るかどうか。trueならidのチェックもする。
	 * @param {Object} manager データモデルマネージャ
	 */
	function createValueCheckFuncsBySchema(schema, isDataModel, manager) {
		var checkFuncs = {};
		for ( var p in schema) {
			checkFuncs[p] = createCheckValueBySchemaPropertyObj(schema[p], isDataModel, manager);
		}
		return checkFuncs;
	}

	/**
	 * constraintオブジェクトから、値がそのconstraintの条件を満たすかどうか判定する関数を作成する
	 *
	 * @private
	 * @param {Object} constraint constraintオブジェクト
	 * @returns {function} 値がconstraintを満たすかどうかチェックする関数。正しい場合は空配列、そうじゃない場合は引っかかった項目を返す
	 */
	function createConstraintCheckFunction(constraint) {
		return function(v) {
			var errObjs = [];
			if (constraint.notNull && v == null) {
				errObjs.push({
					notNull: constraint.notNull
				});
			}
			if (constraint.notEmpty && !v) {
				errObjs.push({
					notEmpty: constraint.notEmpty
				});
			}
			if (v == null) {
				// notNull,notEmptyのチェック以外は、nullでないものについてチェックを行うので、nullならtrueを返す
				return errObjs;
			}
			if (constraint.min != null && v < constraint.min) {
				errObjs.push({
					min: constraint.min
				});
			}
			if (constraint.max != null && constraint.max < v) {
				errObjs.push({
					max: constraint.max
				});
			}
			if (constraint.minLength != null && v.length < constraint.minLength) {
				errObjs.push({
					minLength: constraint.minLength
				});
			}
			if (constraint.maxLength != null && constraint.maxLength < v.length) {
				errObjs.push({
					maxLength: constraint.maxLength
				});
			}
			if (constraint.pattern != null && !v.match(constraint.pattern)) {
				errObjs.push({
					pattern: constraint.pattern
				});
			}
			return errObjs;
		};
	}

	/**
	 * type指定された文字列(から"[]"を除いた文字列)、引数がそのtypeを満たすかどうか判定する関数を作成する
	 *
	 * @private
	 * @param {string} elmType type指定文字列
	 * @param {Object} [opt] type判定に使用するためのオプション
	 * @param {Object} [opt.manager]
	 *            DataManagerオブジェクト。"@DataModel"のようにデータモデルを指定された場合、managerからデータモデルを探す
	 * @param {array} [opt.enumValue] typeが"enum"の場合、enumValueに入っているかどうかで判定する
	 * @returns {function} 引数がそのtypeを満たすかどうか判定する関数。満たすなら空配列、満たさないならエラーオブジェクトの入った配列を返す。
	 */
	function createTypeCheckFunction(elmType, opt) {
		var errObjs = [{
			type: elmType
		}];
		switch (elmType) {
		case 'number':
			return function(v, isStrict) {
				if (isNumberValue(v, isStrict)) {
					return [];
				}
				return errObjs;
			};
		case 'integer':
			return function(v, isStrict) {
				if (isIntegerValue(v, isStrict)) {
					return [];
				}
				return errObjs;
			};
		case 'string':
			return function(v, isStrict) {
				if (isStringValue(v, isStrict)) {
					return [];
				}
				return errObjs;
			};
		case 'boolean':
			return function(v, isStrict) {
				if (isBooleanValue(v, isStrict)) {
					return [];
				}
				return errObjs;
			};
		case 'enum':
			return function(v) {
				if (isEnumValue(v, opt.enumValue)) {
					return [];
				}
				return errObjs;
			};
		case 'any':
			// anyならタイプチェックは行わない
			return function() {
				return [];
			};
		}
		// タイプチェックは終わっているはずなので、どのケースにも引っかからない場合はデータモデルかつ、そのデータモデルはマネージャに存在する
		var matched = elmType.match(/^@(.+?)$/);
		var dataModelName = matched[1];
		var manager = opt.manager;
		return function(v) {
			var dataModel = manager.models[dataModelName];
			if (!dataModel) {
				// チェック時点でモデルがマネージャからドロップされている場合はfalse
				return errObjs;
			}
			if (typeof v !== 'object' && v != null) {
				// オブジェクト(またはnull,undefined)でないならfalse
				return errObjs;
			}
			// チェック時にそのモデルが持ってるアイテムかどうかで判定する
			// nullはOK
			if (v == null || dataModel.has(v)) {
				return [];
			}
			return errObjs;
		};
	}

	/**
	 * チェック関数と、配列の次元を持つオブジェクトを引数にとり、値のチェックを行う関数を作成して返す
	 *
	 * @private
	 * @param {Object} checkObj
	 * @param {array} [checkObj.checkFuncs] チェックする関数の配列。配列の先頭の関数から順番にチェックする。指定のない場合は、return
	 *            true;するだけの関数を作成して返す
	 * @param {integer} [checkObj.dimension]
	 *            チェックする値の配列の次元。配列のdimension次元目が全てcheckFuncsを満たすことと、dimension-1次元目まではすべて配列であることを確認する関数を作成して返す。
	 *            0、または指定無しの場合は配列でないことを表す
	 * @returns {Function} 値をチェックする関数を返す。戻り値の関数はエラー理由を返す。length;0ならエラーでない。
	 */
	function createCheckValueByCheckObj(checkObj) {
		var funcs = checkObj.checkFuncs;
		if (!funcs || funcs.length === 0) {
			return function() {
				return [];
			};
		}
		var dim = checkObj.dimension || 0;
		/**
		 * 値のチェックを行う関数
		 *
		 * @param {Any} val 値
		 * @param {Boolean} isStrict 型変換可能ならOKにするかどうか
		 */
		return function checkValue(val, isStrict) {
			var errorReason = [];
			function _checkValue(v, d) {
				if (!d) {
					// チェック関数を順番に適用して、falseが返ってきたらチェック終了してfalseを返す
					for (var i = 0, l = funcs.length; i < l; i++) {
						var result = funcs[i](v, isStrict);
						if (result.length) {
							errorReason = errorReason.concat(result);
							return false;
						}
					}
					return true;
				}
				// 配列指定なのにセットする値が配列でない場合はfalseを返す
				// ただしnullなら空配列同等の扱いをするので、チェックで弾かない
				if (v == null) {
					return true;
				}
				if (!isArray(v) && !h5.core.data.isObservableArray(v)) {
					errorReason.push({
						dimension: dim
					});
					return false;
				}
				for (var i = 0, l = v.length; i < l; i++) {
					// 配列の各要素について、次元を一つ減らして再帰的にチェックする
					if (!_checkValue(v[i], d - 1)) {
						return false;
					}
				}
				// 全ての要素についてチェックが通ればtrue
				return true;
			}
			_checkValue(val, dim);
			return errorReason;
		};
	}

	//========================================================
	//
	// バリデーション関係コードここまで
	//
	//========================================================
	/**
	 * ObservableItemまたはDataItemのインスタンスと、初期化プロパティを引数にとり、 アイテムインスタンスの初期化処理を行います。
	 *
	 * @private
	 * @param {DataItem|ObservableItem} item
	 * @param {Object} schema スキーマ
	 * @param {Object} schemaInfo チェック済みスキーマ
	 * @param {Object} userInitialValue 初期値としてsetする値が格納されたオブジェクト
	 */
	function initItem(item, schema, schemaInfo, userInitialValue) {
		// アイテムが持つ値を格納するオブジェクト
		item._values = {};

		// nullPropsの設定
		/** type:[]なプロパティで、最後にset()された値がnullかどうかを格納する。キー：プロパティ名、値：true/false */
		item._nullProps = {};

		// 配列のプロパティを設定
		for ( var plainProp in schema) {
			if (schema[plainProp] && isTypeArray(schema[plainProp].type)) {
				//配列の場合は最初にObservableArrayのインスタンスを入れる
				var obsArray = createObservableArray();
				//DataItemまたはObsItemに属するObsArrayには、Item自身への参照を入れておく。
				//これによりイベントハンドラ内でこのItemを参照することができる
				/**
				 * ObservableArrayが所属しているDataItemまたはObservableItemのインスタンス
				 * <p>
				 * ObservableArrayがDataItemまたはObservableItemが持つインスタンスである場合、このプロパティにそのアイテムのインスタンスが格納されています。
				 * </p>
				 *
				 * @name relatedItem
				 * @memberOf ObservableArray
				 * @type {DataItem|ObservableItem}
				 */
				obsArray.relatedItem = item;
				// 値のセット
				setValue(item, plainProp, obsArray);
				item._nullProps[plainProp] = true;
			}
		}
	}

	/**
	 * Itemとプロパティ名を引数にとり、_valuesに格納されている値を返す
	 *
	 * @private
	 * @param {DataItem|ObservableItem} item DataItemまたはObservableItem
	 * @param {String} prop プロパティ名
	 * @returns {Any} Item._values[prop]
	 */
	function getValue(item, prop) {
		return item._values[prop];
	}

	/**
	 * Itemとプロパティ名と値引数にとり、Item._valuesに値を格納する
	 *
	 * @private
	 * @param {DataItem|ObservableItem} item DataItemまたはObservableItem
	 * @param {String} prop プロパティ名
	 * @param {Any} value 値
	 */
	function setValue(item, prop, value) {
		item._values[prop] = value;
	}

	/**
	 * 渡されたタイプ指定文字が配列かどうかを返します
	 *
	 * @private
	 * @param {String} typeStr タイプ指定文字列
	 * @returns {Boolean} タイプ指定文字列が配列指定かどうか
	 */
	function isTypeArray(typeStr) {
		if (!typeStr) {
			return false;
		}
		return typeStr.indexOf('[]') !== -1;
	}

	/**
	 * validateDescriptor/Schema/DefaultValueが投げるエラー情報の配列に格納するエラーオブジェクトを作成する
	 *
	 * @private
	 * @param {Integer} code エラーコード
	 * @param {Array} msgParam メッセージパラメータ
	 * @param {Boolean} stopOnError
	 * @returns {Object} エラーオブジェクト
	 */
	function createItemDescErrorReason(/* var args */) {
		var args = arguments;
		var code = args[0];
		var ret = {
			code: code
		};
		/* del begin */
		args[0] = DESCRIPTOR_VALIDATION_ERROR_MSGS[code];
		ret.message = h5.u.str.format.apply(null, args);
		/* del end */
		// min版はメッセージがないので格納しない
		return ret;
	}

	/**
	 * データモデルのitemsChangeイベントオブジェクトを作成する
	 *
	 * @private
	 */
	function createDataModelItemsChangeEvent(created, recreated, removed, changed) {
		return {
			type: EVENT_ITEMS_CHANGE,
			created: created,
			recreated: recreated,
			removed: removed,
			changed: changed
		};
	}
	/**
	 * 依存プロパティの再計算を行います。再計算後の値はitemの各依存プロパティに代入されます。
	 *
	 * @private
	 * @param {DataItem} item データアイテム
	 * @param {Object} event プロパティ変更イベント
	 * @param {String|String[]} changedProps 今回変更されたプロパティ
	 * @param {Boolean} isCreate create時に呼ばれたものかどうか。createなら値の変更を見ずに無条件でcalcを実行する
	 * @returns {Object} { dependProp1: { oldValue, newValue }, ... } という構造のオブジェクト
	 */
	function calcDependencies(item, event, changedProps, isCreate) {
		// 今回の変更に依存する、未計算のプロパティ
		var targets = [];

		var schema = getSchema(item);
		var dependsMap = item._dependencyMap;

		/**
		 * この依存プロパティが計算可能（依存するすべてのプロパティの再計算が完了している）かどうかを返します。
		 * 依存しているプロパティが依存プロパティでない場合は常にtrue(計算済み)を返します
		 * 依存しているプロパティが依存プロパティが今回の変更されたプロパティに依存していないならtrue(計算済み)を返します
		 */
		function isReady(dependProp) {
			var deps = wrapInArray(schema[dependProp].depend.on);
			for (var i = 0, len = deps.length; i < len; i++) {
				if ($.inArray(deps[i], item._realProperty) === -1
						&& $.inArray(deps[i], targets) !== -1) {
					// 依存先が実プロパティでなく、未計算のプロパティであればfalseを返す
					return false;
				}
			}
			return true;
		}

		/**
		 * changedPropsで指定されたプロパティに依存するプロパティをtargetArrayに追加する
		 */
		function addDependencies(targetArray, srcProps) {
			for (var i = 0, len = srcProps.length; i < len; i++) {
				var depends = dependsMap[srcProps[i]];

				if (!depends) {
					continue;
				}

				for (var j = 0, jlen = depends.length; j < jlen; j++) {
					var dprop = depends[j];
					if ($.inArray(dprop, targetArray) === -1) {
						targetArray.push(dprop);
					}
				}
			}
		}

		var ret = {};

		if (isCreate) {
			// createならすべての実プロパティに依存するプロパティを列挙する
			// create時にundefinedがセットされた場合、変更なしなのでchangedPropsに入らないが、calcは計算させる
			targets = item._dependProps.slice();
		} else {
			//今回変更された実プロパティに依存するプロパティを列挙
			addDependencies(targets, wrapInArray(changedProps));
		}

		while (targets.length !== 0) {
			var restTargets = [];

			//各依存プロパティについて、計算可能（依存するすべてのプロパティが計算済み）なら計算する
			for (var i = 0, len = targets.length; i < len; i++) {
				var dp = targets[i];

				if (isReady(dp)) {
					var newValue = schema[dp].depend.calc.call(item, event);

					// 型変換を行わない厳密チェックで、戻り値をチェックする
					var errReason = item._validateItemValue(dp, newValue, true);
					if (errReason.length !== 0) {
						// calcの返した値が型・制約違反ならエラー
						throwFwError(ERR_CODE_CALC_RETURNED_INVALID_VALUE, [
								item._model ? item._model.name : NOT_AVAILABLE, dp, newValue]);
					}
					ret[dp] = {
						oldValue: getValue(item, dp),
						newValue: newValue
					};
					// calcの結果をセット
					if (schema[dp] && isTypeArray(schema[dp].type)) {
						//配列の場合は値のコピーを行う。ただし、コピー元がnullの場合があり得る(type:[]はnullable)
						//その場合は空配列をコピー

						// item._nullPropsにnullかどうかを保持する
						if (newValue) {
							getValue(item, dp).copyFrom(newValue);
							// newValueがnullでないならregardAsNull()がtrueを返すようにする
							item._nullProps[dp] = false;
						} else {
							getValue(item, dp).copyFrom([]);
							// newValueがnullまたはundefinedならregardAsNull()がtrueを返すようにする
							item._nullProps[dp] = true;
						}
					} else {
						setValue(item, dp, newValue);
					}
				} else {
					restTargets.push(dp);
				}
			}

			//今回計算対象となったプロパティに（再帰的に）依存するプロパティをrestに追加
			//restTargetsは「今回計算できなかったプロパティ＋新たに依存関係が発見されたプロパティ」が含まれる
			addDependencies(restTargets, targets);

			targets = restTargets;
		}

		return ret;
	}

	/**
	 * 渡されたオブジェクトがスキーマを満たすかどうかをチェックする 満たさない場合は例外を投げる。
	 * depend項目のセットはここではエラーにならない。現在の値と厳密等価な値のセットはOKなため、validate時のアイテムの値が分からない限り判定できないため。
	 * depend.calcの計算も行わない。calcの結果がセット時のアイテムの状態によって変わったり、副作用のある関数の可能性もあるため。
	 * そのため、depend項目のスキーマチェックも行われない。
	 *
	 * @private
	 */
	function validateValueObj(schema, validateItemValue, valueObj, model) {
		for ( var prop in valueObj) {
			if (!(prop in schema)) {
				// schemaに定義されていないプロパティ名が入っていたらエラー
				throwFwError(ERR_CODE_CANNOT_SET_NOT_DEFINED_PROPERTY, [
						model ? model.name : NOT_AVAILABLE, prop]);
			}
			var newValue = valueObj[prop];

			//type:[]で、代入指定無しの場合はvalidationを行わない
			if (schema[prop] && isTypeArray(schema[prop].type) && !valueObj.hasOwnProperty(prop)) {
				continue;
			}

			// modelがある場合はプロパティがidKeyかどうかを調べる
			var isId = model && model._idKey === prop;

			// 型・制約チェック
			// 配列が渡された場合、その配列の要素が制約を満たすかをチェックしている
			// idKeyの場合は、isStrictをtrueにしてvalidateItemValueを呼び出す。
			// (idの場合はtype:'string'でもnew Strng()で作ったラッパークラスのものは入らない)
			var validateResult = validateItemValue(prop, newValue, isId);
			if (validateResult.length > 0) {
				throwFwError(ERR_CODE_INVALID_ITEM_VALUE,
						[model ? model.name : NOT_AVAILABLE, prop], validateResult);
			}
		}
	}

	/**
	 * アイテムに値をセットする
	 */
	function itemSetter(item, valueObj, ignoreProps, isCreate) {
		var schema = getSchema(item);

		// valueObjから整合性チェックに通ったものを整形して格納する配列
		var readyProps = [];

		//先に、すべてのプロパティの整合性チェックを行う
		for ( var prop in valueObj) {
			if (ignoreProps && ($.inArray(prop, ignoreProps) !== -1)) {
				//このpropプロパティは無視する
				continue;
			}

			var oldValue = getValue(item, prop);
			var newValue = valueObj[prop];

			// depend指定されている項目はsetしない
			if (schema[prop] && schema[prop].depend) {
				// dependなプロパティの場合、現在の値とこれから代入しようとしている値が
				// 厳密等価でtrueになる場合に限り、代入を例外にせず無視する。
				// これは、item.get()の戻り値のオブジェクトをそのままset()しようとしたときに
				// dependのせいでエラーにならないようにするため。
				if (oldValue !== newValue) {
					throwFwError(ERR_CODE_DEPEND_PROPERTY, [
							item._model ? item._model.name : NOT_AVAILABLE, prop]);
				}

				// 厳密等価な場合は無視
				continue;
			}

			var type = schema[prop] && schema[prop].type;

			// 配列でかつnewValueがnullまたはundefinedなら、空配列が渡された時と同様に扱う。
			// エラーにせず、保持しているObsAryインスタンスを空にする。
			if (isTypeArray(type)) {
				if (newValue == null) {
					newValue = [];
					item._nullProps[prop] = true;
				} else {
					item._nullProps[prop] = false;
				}
			}

			// typeがstring,number,integer,boolean、またはその配列なら、値がラッパークラスの場合にunboxする
			if (type && type.match(/string|number|integer|boolean/)) {
				newValue = unbox(newValue);
			}

			//値がnull以外なら中身の型変換行う
			//typeがnumber,integerで、newValueが文字列(もしくは配列)なら型変換を行う
			//型のチェックは終わっているので、typeがnumber・integerならnewValueは数値・数値変換可能文字列・null またはそれらを要素に持つ配列のいずれかである
			if (newValue != null && type && type.match(/number|integer/)
					&& typeof newValue !== 'number') {
				if (isArray(newValue) || h5.core.data.isObservableArray(newValue)) {
					for (var i = 0, l = newValue.length; i < l; i++) {
						// スパースな配列の場合、undefinedが入っている可能性があるので、!= で比較
						// parseFloatできる値(isNumberValueに渡してtrueになる値)ならparseFloatする
						if (newValue[i] != null && isNumberValue(newValue[i])) {
							newValue[i] = parseFloat(newValue[i]);
						}
					}
				} else if (newValue != null) {
					newValue = parseFloat(newValue);
				}
			}

			// 配列なら、配列の中身も変更されていないかチェックする(type:anyならチェックしない)
			// type:[]の場合、oldValueは必ずObsArrayまたはundefined。
			// newValue,oldValueともに配列(oldValueの場合はObsArray)かつ、長さが同じ場合にのみチェックする
			if (isTypeArray(type) && oldValue && oldValue.equals(newValue)) {
				continue;
			}

			// 値の型変更を行った後に、値が変更されていないかチェックする。(NaN -> NaN も変更無し扱い)
			if (oldValue === newValue || isStrictNaN(oldValue) && isStrictNaN(newValue)) {
				//同じ値がセットされた場合は何もしない
				continue;
			}

			// ObservableArrayの場合、oldValueはスナップしたただの配列にする
			// ただし、typeが未指定またはanyにObservableArrayが入っていた場合はそのまま
			if (type && type.indexOf('[]') !== -1 && h5.core.data.isObservableArray(oldValue)) {
				//TODO sliceを何度もしないようにする
				oldValue = oldValue.toArray();
			}

			//ここでpushしたプロパティのみ、後段で値をセットする
			readyProps.push({
				p: prop,
				o: oldValue,
				n: newValue
			});
		}
		//更新する値のない場合は何も返さないで終了
		if (!readyProps.length) {
			return;
		}

		var changedProps = {};
		var changedPropNameArray = [];

		//値の変更が起こる全てのプロパティについて整合性チェックが通ったら、実際に値を代入する
		for (var i = 0, len = readyProps.length; i < len; i++) {
			var readyProp = readyProps[i];

			//TODO 判定文改良
			if (schema[readyProp.p] && isTypeArray(schema[readyProp.p].type)) {
				//配列の場合は値のコピーを行う。ただし、コピー元がnullの場合があり得る（create()でdefaultValueがnull）ので
				//その場合はコピーしない
				if (readyProp.n) {
					getValue(item, readyProp.p).copyFrom(readyProp.n);
				}
			} else {
				//新しい値を代入
				setValue(item, readyProp.p, readyProp.n);
			}

			//newValueは現在Itemが保持している値（type:[]の場合は常に同じObsArrayインスタンス）
			changedProps[readyProp.p] = {
				oldValue: readyProp.o,
				newValue: item.get(readyProp.p)
			};

			changedPropNameArray.push(readyProp.p);
		}

		//最初にアイテムを生成した時だけ、depend.calcに渡すイベントのtypeはcreateにする
		var eventType = isCreate === true ? 'create' : 'change';

		//今回変更されたプロパティと依存プロパティを含めてイベント送出
		var event = {
			type: eventType,
			target: item,
			props: changedProps
		};

		// 依存プロパティを再計算し、変更があったらchangeイベントに含める
		$.extend(changedProps, calcDependencies(item, event, changedPropNameArray, isCreate));

		return event;
	}

	/**
	 * 当該モデルに対応するアップデートログ保持オブジェクトを取得する。 オブジェクトがない場合は生成する。
	 */
	function getModelUpdateLogObj(model) {
		var manager = model._manager;
		var modelName = model.name;

		if (!manager._updateLogs) {
			manager._updateLogs = {};
		}

		if (!manager._updateLogs[modelName]) {
			manager._updateLogs[modelName] = {};
		}

		return manager._updateLogs[modelName];
	}


	/**
	 * 当該モデルが属しているマネージャにUpdateLogを追加する
	 */
	function addUpdateLog(model, type, items) {
		if (!model._manager) {
			return;
		}

		var modelLogs = getModelUpdateLogObj(model);

		for (var i = 0, len = items.length; i < len; i++) {
			var item = items[i];
			var itemId = item._values[model._idKey];

			if (!modelLogs[itemId]) {
				modelLogs[itemId] = [];
			}
			modelLogs[itemId].push({
				type: type,
				item: item
			});
		}
	}

	/**
	 * 当該モデルが属しているマネージャにUpdateChangeLogを追加する
	 */
	function addUpdateChangeLog(model, ev) {
		if (!model._manager) {
			return;
		}

		var modelLogs = getModelUpdateLogObj(model);

		var itemId = ev.target._values[model._idKey];

		if (!modelLogs[itemId]) {
			modelLogs[itemId] = [];
		}
		modelLogs[itemId].push({
			type: UPDATE_LOG_TYPE_CHANGE,
			ev: ev
		});
	}

	/**
	 * ObsArrayのスナップショットをmanager._oldValueLogsに保存しておく アップデートセッション中に複数回変更しても、保存しておくoldValueは1つでいいので、
	 * すでに保存済みなら配列のsliceはしない。
	 */
	function addObsArrayOldValue(model, item, prop) {
		if (!model._manager) {
			return;
		}

		var modelLogs = getModelOldValueLogObj(model);

		var itemId = item._values[model._idKey];

		if (!modelLogs[itemId]) {
			modelLogs[itemId] = {};
		}

		if (!modelLogs[itemId][prop]) {
			modelLogs[itemId][prop] = getValue(item, prop).toArray();
			return;
		}

		// すでに存在していれば、oldValue保存済みなので、何もしない
		return;
	}

	/**
	 * 当該モデルに対応するアップデートログ保持オブジェクトを取得する。 オブジェクトがない場合は生成する。
	 */
	function getModelOldValueLogObj(model) {
		var manager = model._manager;
		var modelName = model.name;

		if (!manager._oldValueLogs) {
			manager._oldValueLogs = {};
		}

		if (!manager._oldValueLogs[modelName]) {
			manager._oldValueLogs[modelName] = {};
		}

		return manager._oldValueLogs[modelName];
	}

	/**
	 * schemaからdepend項目の依存関係を表すマップを作成する
	 *
	 * @private
	 * @param schema
	 * @returns {Object}
	 */
	function createDependencyMap(schema) {
		//{ 依存元: [依存先] }という構造のマップ。依存先プロパティは配列内で重複はしない。
		var dependencyMap = {};

		for ( var prop in schema) {
			if (schema.hasOwnProperty(prop)) {
				var dependency = schema[prop] ? schema[prop].depend : null;
				if (dependency) {
					var dependOn = wrapInArray(dependency.on);
					for (var i = 0, len = dependOn.length; i < len; i++) {
						var dependSrcPropName = dependOn[i];

						if (!dependencyMap[dependSrcPropName]) {
							dependencyMap[dependSrcPropName] = [];
						}
						if ($.inArray(prop, dependencyMap[dependSrcPropName]) === -1) {
							dependencyMap[dependSrcPropName].push(prop);
						}
					}
				}
			}
		}

		return dependencyMap;
	}
	/**
	 * 第一引数に指定された名前のデータモデルマネージャを作成します。
	 * <p>
	 * 第2引数が渡された場合、その名前空間に<a href="DataModelManager.html">DataModelManager</a>インスタンスを公開します。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @param {String} name マネージャ名
	 * @param {String} [namespace] 公開先名前空間
	 * @returns {DataModelManager} データモデルマネージャ
	 */
	function createManager(managerName, namespace) {
		if (!isValidNamespaceIdentifier(managerName)) {
			throwFwError(ERR_CODE_INVALID_MANAGER_NAME);
		}

		//データモデルマネージャインスタンスを生成
		var manager = new DataModelManager(managerName);

		//第2引数が省略される場合もあるので、厳密等価でなく通常の等価比較を行う
		if (namespace != null) {
			//指定された名前空間に、managerNameでマネージャを公開する
			// 空文字指定ならグローバルに公開する
			if (namespace === '') {
				namespace = 'window';
			}
			var o = {};
			o[managerName] = manager;
			h5.u.obj.expose(namespace, o);
		}
		return manager;
	}

	/**
	 * モデルを作成する。descriptorは配列で指定可能。
	 * <p>
	 * thisはデータモデルマネージャから呼ばれた場合はそのデータモデルマネージャ。
	 * </p>
	 */
	function createModel(descriptor) {
		// descriptorがオブジェクトまたは配列じゃなかったらエラー
		if (!descriptor || typeof descriptor !== 'object') {
			throwFwError(ERR_CODE_INVALID_DESCRIPTOR, null,
					[createItemDescErrorReason(DESC_ERR_DETAIL_NOT_OBJECT)]);
		}

		if (!isArray(descriptor)) {
			// 既に同名のモデルが登録済みならそれを返す。
			if (this.models[descriptor.name]) {
				fwLogger.info(MSG_ERROR_DUP_REGISTER, this.name, descriptor.name);
				return this.models[descriptor.name];
			}

			//createItemProtoは初めにDescriptorの検証を行う。
			//検証エラーがある場合は例外を送出する。
			//エラーがない場合はデータモデルを返す（登録済みの場合は、すでにマネージャが持っているインスタンスを返す）。
			return _createModel(descriptor, this);
		}

		// descriptorが配列なら、中身を展開して登録。
		// 依存関係順に登録する必要がある。
		// 登録したデータモデルを配列に格納して返す。
		var l = descriptor.length;
		if (!l) {
			//空配列ならエラー
			throwFwError(ERR_CODE_INVALID_DESCRIPTOR, null,
					[createItemDescErrorReason(DESC_ERR_DETAIL_NOT_OBJECT)]);
		}

		var dependMap = {};
		var namesInDescriptors = [];
		// 依存関係のチェック
		// 要素がオブジェクトであり、name、schemaプロパティを持っていない場合はcatch節で、ディスクリプタのエラーを投げる
		for (var i = 0; i < l; i++) {

			// 既に同名のモデルがあるかどうかチェックし、それらは新規登録しない
			var name = descriptor[i].name;
			if (this.models[name]) {
				fwLogger.info(MSG_ERROR_DUP_REGISTER, this.name, descriptor.name);
				retObj[i] = manager.models[descriptor.name];
				continue;
			}

			try {
				namesInDescriptors.push(name);
				var depends = [];
				if (descriptor[i].base) {
					depends.push(descriptor[i].base.substring(1));
				}
				for ( var p in descriptor[i].schema) {
					var propObj = descriptor[i].schema[p];
					if (!propObj) {
						continue;
					}
					var type = propObj.type;
					if (type && type.substring(0, 1) === '@') {
						type = (type.indexOf('[]') === -1) ? type.substring(1) : type.substring(1,
								type.length - 2);
						depends.push(type);
					}
				}
				dependMap[i] = {
					depends: depends
				};
			} catch (e) {
				//descriptorがオブジェクトでない、またはnameとschemaが設定されていない。またはname,baseが文字列でない、schemaがオブジェクトでない
				throwFwError(ERR_CODE_INVALID_DESCRIPTOR);
			}
		}
		// dependMapを元に、循環参照チェック
		var retObj = {
			size: 0
		};
		while (retObj.size < l) {
			// 見つからなかったモデルを覚えておく
			// 循環参照のエラーなのか、単に存在しないモデル名指定によるエラーなのかを区別するため
			var noExistModels = {};

			// このwhileループ内で1つでも登録されたか
			var registed = false;

			// descriptorでループさせて、依存関係が解決された居たらデータモデルを登録
			for (var i = 0; i < l; i++) {
				if (!dependMap[i].registed) {
					var depends = dependMap[i].depends;
					for (var j = 0, len = depends.length; j < len; j++) {
						if (!this.models[depends[j]]) {
							noExistModels[depends[j]] = true;
							break;
						}
					}
					if (j === len) {
						// 依存しているものはすべて登録済みなら登録
						retObj[i] = _createModel(descriptor[i], this);
						retObj.size++;
						registed = true;
						dependMap[i].registed = true;
					}
				}
			}
			if (!registed) {
				// whileループの中で一つも登録されなかった場合は、存在しないデータモデル名を依存指定、または循環参照
				// 存在しなかったデータモデル名が全てディスクリプタに渡されたモデル名のいずれかだったら、それは循環参照エラー
				var isCircular = true;
				for ( var modelName in noExistModels) {
					if ($.inArray(modelName, namesInDescriptors) === -1) {
						isCircular = false;
						break;
					}
				}
				if (isCircular) {
					// 循環参照エラー
					throwFwError(ERR_CODE_DESCRIPTOR_CIRCULAR_REF);
				}
				throwFwError(ERR_CODE_INVALID_DESCRIPTOR, null, [createItemDescErrorReason(
						DESC_ERR_DETAIL_NO_EXIST_BASE, modelName)]);
			}
		}
		var retAry = [];
		for (var i = 0; i < l; i++) {
			retAry.push(retObj[i]);
		}
		return retAry;
	}

	/**
	 * モデルを作成する。
	 * <p>
	 * thisはデータモデルマネージャから呼ばれた場合はそのデータモデルマネージャ。
	 * </p>
	 */
	function _createModel(desc, manager) {
		validateDescriptor(desc, manager, true);
		var schema = extendSchema(desc, manager);
		validateSchema(schema, true, manager, true);
		var itemValueCheckFuncs = createValueCheckFuncsBySchema(schema, true, manager);
		validateDefaultValue(schema, itemValueCheckFuncs, true);

		return new DataModel(schema, desc, itemValueCheckFuncs, manager);
	}

	/**
	 * ObsItem,DataItemの生成に必要なスキーマ情報のキャッシュデータを作成します。
	 *
	 * @param {Object} schema validate済みでかつ継承先の項目も拡張済みのスキーマ
	 * @param {Object} itemValueCheckFuncs プロパティの値をチェックする関数を持つオブジェクト
	 * @returns {Object} ObsItem,DataItemの生成に必要なスキーマのキャッシュデータ
	 */
	function createSchemaInfoCache(schema, itemValueCheckFuncs) {
		// 実プロパティ・依存プロパティ・配列プロパティを列挙
		var realProps = [];
		var dependProps = [];
		var aryProps = [];
		for ( var p in schema) {
			if (schema[p] && schema[p].depend) {
				dependProps.push(p);
			} else {
				realProps.push(p);
			}
			if (schema[p] && schema[p].type && schema[p].type.indexOf('[]') !== -1) {
				aryProps.push(p);
			}
		}

		// 依存プロパティのマップ
		var dependencyMap = createDependencyMap(schema);

		function validateItemValue(p, value, isStrict) {
			return itemValueCheckFuncs[p](value, isStrict);
		}

		var defaultInitialValue = {};
		for ( var plainProp in schema) {
			var propDesc = schema[plainProp];

			if (propDesc && propDesc.depend) {
				//依存プロパティにはデフォルト値はない（最後にrefresh()で計算される）
				continue;
			}

			var initValue = null;

			if (propDesc && propDesc.defaultValue !== undefined) {
				//DescriptorのdefaultValueがあれば代入
				initValue = propDesc.defaultValue;
			} else {
				//どちらでもない場合はnull
				initValue = null;
			}

			defaultInitialValue[plainProp] = initValue;
		}

		function createInitialValueObj(userInitialValue) {
			if (!userInitialValue) {
				return $.extend({}, defaultInitialValue);
			}
			// 単に$.extend({}, defaultInitialValue, userInitialValue)だとundefinedの値で上書きできないので、
			// for文でuserInitialValueに指定されたものを代入する
			var actualInitialValue = $.extend({}, defaultInitialValue);
			for ( var p in userInitialValue) {
				actualInitialValue[p] = userInitialValue[p];
			}
			return actualInitialValue;
		}

		var ret = {
			_realProps: realProps,
			_dependProps: dependProps,
			_aryProps: aryProps,
			_dependencyMap: dependencyMap,
			_createInitialValueObj: createInitialValueObj,
			/**
			 * 引数にプロパティ名と値を指定し、値がそのプロパティの制約条件を満たすかどうかをチェックします。
			 *
			 * @private
			 * @memberOf DataItem
			 * @param {String} prop プロパティ名
			 * @param {Any} value 値
			 * @returns {Boolean} 値がプロパティの制約条件を満たすならtrue
			 */
			_validateItemValue: validateItemValue
		};
		return ret;
	}

	/**
	 * データモデルにおけるスキーマの継承関係を展開してマージしたスキーマを返します。
	 * <p>
	 * 同じ名前のプロパティは「後勝ち」です。継承関係を構築できるのは同一のデータマネージャに属するデータモデル間のみです。
	 * </p>
	 *
	 * @param {Object} desc データモデルの場合はデスクリプタ。
	 * @param {Object} manager データモデルマネージャ。
	 * @returns {Object} 生成したスキーマオブジェクト。
	 */
	function extendSchema(desc, manager) {
		var base = desc.base;
		var baseSchema;

		if (base) {
			// base指定がある場合はそのモデルを取得
			var baseModel = manager.models[base.slice(1)];

			// base指定されたモデルのschemaを取得
			baseSchema = baseModel.schema;
		} else {
			//baseが指定されていない場合は"親"は存在しない＝プロパティを持たない
			baseSchema = {};
		}
		// baseSchemaとschemaをschema優先でマージした結果をschemaに格納する。baseSchemaは上書きしない。
		return $.extend({}, baseSchema, desc.schema);
	}

	/**
	 * DataItem、ObservableItemのが持つObservableArrayのプロパティに対して、リスナを登録します
	 *
	 * @private
	 * @param {DataItem||ObservableItem} item
	 * @param {String} propName プロパティ名
	 * @param {ObservableArray} リスナ登録をするObservableArray
	 * @param {DataModel} [model] モデル(DataItemの場合)
	 */
	function setObservableArrayListeners(item, propName, observableArray, model) {
		// 配列操作前と操作後で使う共通の変数
		// 配列操作が同期のため、必ずchangeBeforeListener→配列操作→changeListenerになるので、ここのクロージャ変数を両関数で共通して使用できる

		// アップデートセッション中かどうか
		var isAlreadyInUpdate = false;

		// 破壊的メソッドだが、追加しないメソッド。validateする必要がない。
		var noAddMethods = ['sort', 'reverse', 'pop', 'shift'];

		// changeBefore時に配列の変更前の値を覚えておく
		var oldValue = null;

		function changeBeforeListener(event) {
			// データモデルの場合、itemがmodelに属していない又は、itemが属しているmodelがmanagerに属していないならエラー
			if (model && (item._isRemoved || !model._manager)) {
				throwFwError(ERR_CODE_CANNOT_CHANGE_REMOVED_ITEM, [item._values[model._idKey],
						event.method]);
			}

			var args = h5.u.obj.argsToArray(event.args);
			if ($.inArray(event.method, noAddMethods) === -1) {
				var isValidateRequired = true;

				// チェックするメソッドは unshift, push, splice, copyFrom, set
				// そのうち、メソッドの引数をそのままチェックすればいいのはunshift, push
				switch (event.method) {
				case 'splice':
					if (args.length <= 2) {
						// spliceに引数が2つなら要素追加はないので、validateチェックはしない
						isValidateRequired = false;
					}
					isValidateRequired = false;
					// spliceの場合追加要素は第3引数以降のため2回shiftする
					args.shift();
					args.shift();
					break;

				case 'copyFrom':
					// copyFromの場合は引数が配列であるため、外側の配列を外す
					args = args[0];
					break;

				case 'set':
					// setの場合は第1引数はindexなので、shift()したものをチェックする
					args.shift();

				}

				if (isValidateRequired) {
					var validateResult = item._validateItemValue(propName, args);
					if (validateResult.length > 0) {
						throwFwError(ERR_CODE_INVALID_ITEM_VALUE, propName, validateResult);
					}
				}
			}
			// データアイテムの場合はイベント管理
			if (model) {
				// oldValueが登録されていなければ登録
				addObsArrayOldValue(model, item, propName);

				// 配列操作前にbeginUpdateして、配列操作後にendUpdateする
				isAlreadyInUpdate = model._manager ? model._manager.isInUpdate() : false;
				if (!isAlreadyInUpdate) {
					model._manager.beginUpdate();
				}
			} else {
				//oldValueを保存
				oldValue = item._values[propName].toArray();
			}
		}

		function changeListener(event) {
			// Itemのset内で呼ばれた、または、method===null(endUpdate時にdispatchEventで呼ばれた場合)なら何もしない
			if (item._isInSet || event.method === null) {
				return;
			}

			// 配列の要素が全て同じかどうかのチェックはendUpdateのなかでやる

			// changeイベントオブジェクトの作成
			var ev = {
				type: 'change',
				target: item,
				props: {}
			};

			// newValueは現在の値、oldValueはmanager._oldValueLogsの中なので、ここでpropsを入れる必要ない
			ev.props[propName] = {};

			// データアイテムの場合はモデルにイベントを伝播
			if (model) {
				// アップデートログを追加
				addUpdateChangeLog(model, ev);

				if (!isAlreadyInUpdate) {
					// アップデートセッション中じゃなければすぐにendUpdate()
					// _isArrayPropChangeSilentlyRequestedをtrueにして、endUpdate()時にdispatchされないようにする
					model._manager._isArrayPropChangeSilentlyRequested = true;
					model._manager.endUpdate();
					// endUpdateが終わったらフラグを元に戻す
					model._manager._isArrayPropChangeSilentlyRequested = false;
				} else {
					// アップデートセッション中であればendUpdate()が呼ばれたときに、endUpdate()がchangeを発火させるので、
					// ObservableArrayのchangeをここでストップする。
					// DataItemが持つtype:arrayのプロパティのObservableArrayはDataItem作成時に生成しており、
					// このchangeListenerがそのObservableArrayの一番最初に登録されたハンドラになります。
					// ハンドラは登録された順番に実行されるため、ここでstopImmediatePropagation()することで
					// 登録されたすべてのハンドラの実行をストップすることができます。
					event.stopImmediatePropagation();
				}
			} else {
				// ObservableItemの場合は、配列の値が変更されていたら即イベント発火する
				// 配列の値が変化していないなら何もしない
				if (observableArray.equals(oldValue)) {
					return;
				}

				// ObservableItemの場合は即発火
				ev.props[propName] = {
					oldValue: oldValue,
					newValue: getValue(item, propName)
				};
				item.dispatchEvent(ev);
			}
		}

		observableArray.addEventListener('changeBefore', changeBeforeListener);
		observableArray.addEventListener('change', changeListener);
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	//--------------------------------------------
	// DataModelManager
	//--------------------------------------------

	/**
	 * データモデルマネージャ
	 * <p>
	 * データモデルを管理するデータモデルマネージャクラスです。このインスタンスは<a
	 * href="h5.core.data.html#createManager">h5.core.data.createManager()</a>で作成します。
	 * </p>
	 * <p>
	 * このクラスは<a href="EventDispatcher.html">EventDispatcher</a>のメソッドを持ちます。イベント関連のメソッドについては<a
	 * href="EventDispatcher.html">EventDispatcherミックスイン</a>を参照してください。<br>
	 * データモデルマネージャは、データモデルマネージャが管理するデータモデルに変更があった場合に'itemsChange'イベントが発火します。
	 * </p>
	 *
	 * @since 1.1.0
	 * @class
	 * @mixes EventDispatcher
	 * @name DataModelManager
	 */
	function DataModelManager(managerName) {
		if (!isValidNamespaceIdentifier(managerName)) {
			throwFwError(ERR_CODE_INVALID_MANAGER_NAME);
		}

		/**
		 * このデータモデルマネージャが管理するDataModelインスタンス。
		 * <p>
		 * <a href="#createModel">createmodel()</a>で作成したモデルは、データモデルマネージャの管理下に置かれ、modelsから参照できます。
		 * </p>
		 * <p>
		 * {モデル名: データモデルインスタンス, ...} の構造を持つオブジェクトです。
		 * </p>
		 *
		 * @since 1.1.0
		 * @name models
		 * @type {Object}
		 * @memberOf DataModelManager
		 */
		this.models = {};

		/**
		 * データモデルマネージャ名
		 * <p>
		 * <a href="h5.core.data.html#createManager">h5.core.data.createManager()</a>の第一引数に指定した値が格納されます。
		 * </p>
		 *
		 * @since 1.1.0
		 * @name name
		 * @type {String}
		 * @memberOf DataModelManager
		 */
		this.name = managerName;


		/**
		 * アップデートログ
		 * <p>
		 * マネージャの管理下にあるデータモデル、アイテムのイベントをストアしておくためのオブジェクトです。内部で使用します。
		 * </p>
		 *
		 * @private
		 * @since 1.1.0
		 * @name _updateLogs
		 * @type {Object}
		 * @memberOf DataModelManager
		 */
		this._updateLogs = null;

		/**
		 * endUpdate時に配列プロパティについてイベントをあげないかどうか。
		 * <p>
		 * デフォルトではfalseで、endUpdate時にイベントをあげます。 <br>
		 * DataItem作成時にFW内部で登録したchangeListenerからendUpdateを呼ぶ場合にこのフラグはtrueになり、<br>
		 * endUpdate時に配列プロパティのイベントは上がりません。<br>
		 * </p>
		 *
		 * @private
		 * @name _isArrayPropChangeSilentlyRequested
		 * @type {Boolean}
		 * @memberOf DataModelManager
		 */
		this._isArrayPropChangeSilentlyRequested = false;
	}

	// MixinでEventDispatcherをで継承
	h5.mixin.eventDispatcher.mix(DataModelManager.prototype);
	$.extend(DataModelManager.prototype, {
		/**
		 * データモデルを作成します。
		 * <p>
		 * 引数にはデータモデルディスクリプタを渡します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @param {Object} descriptor データモデルディスクリプタ
		 * @param {String} descriptor.name データモデル名。必須。
		 * @param {String} descriptor.base
		 *            マネージャに属する別のデータモデルのschemaを継承する場合に指定します。『'@'+継承先データモデル名』で指定してください。
		 * @param {Object} descriptor.schema スキーマを定義したオブジェクトを指定します。必須。
		 * @memberOf DataModelManager
		 */
		createModel: createModel,

		/**
		 * 指定されたデータモデルを削除します。
		 * <p>
		 * データアイテムを保持している場合、アイテムをこのデータモデルからすべて削除した後 データモデル自体をマネージャから削除します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @param {String|DataModel} nameOrModel データモデル名またはデータモデルインスタンス
		 * @memberOf DataModelManager
		 */
		dropModel: function(nameOrModel) {
			//TODO dropModelするときに依存していたらどうするか？
			//エラーにしてしまうか。
			var name = isString(nameOrModel) ? nameOrModel
					: (typeof nameOrModel === 'object' ? nameOrModel.name : null);

			if (!name || !this.models[name]) {
				return;
			}
			var model = this.models[name];
			model._manager = null;
			delete this.models[name];
			return model;
		},

		/**
		 * アップデートセッション中かどうかを返します。
		 * <p>
		 * beginUpdate()が呼ばれてからendUpdate()が呼ばれるまでの間はアップデートセッション中です。
		 * </p>
		 *
		 * @since 1.1.0
		 * @returns {Boolean} アップデートセッション中かどうか
		 * @memberOf DataModelManager
		 */
		isInUpdate: function() {
			return this._updateLogs !== null;
		},

		/**
		 * アップデートセッションを開始します。
		 * <p>
		 * beginUpdate()が呼ばれると、アップデートセッションを開始します。<a href="#endUpdate">endUpdate()</a>を呼ぶとアップデートセッションを解除します。
		 * </p>
		 * <p>
		 * 既にアップデートセッション中であれば何もしません。
		 * </p>
		 * <p>
		 * アップデートセッション中は、このDataModelManager、及びこのの管理下にあるDataModel、DataItemのイベントは発火しません。
		 * endUpdate()が呼ばれた時点で、イベントが発火します。
		 * </p>
		 * <p>
		 * アップデートセッション中の変更イベントはすべてマージされてendUpdate()時に発火します。
		 * </p>
		 *
		 * <pre>
		 * 例：
		 * // managerの管理下にあるDataItem
		 * item.set('value', 'a');
		 * item.addEventListener('change', function(e){
		 *     // oldValueとnewValueをalertで表示するイベントリスナ
		 *     alert('oldValue:' + e.prop.value.oldValue + ', newValue:' + e.prop.value.newValue);
		 * });
		 * // アップデートセッション
		 * manager.beginUpdate();
		 * item.set('value', 'b');
		 * item.set('value', 'c');
		 * manager.endUpdate();
		 * // &quot;oldValue: a, newValue: c&quot; とアラートが出る
		 * </pre>
		 *
		 * @since 1.1.0
		 * @returns {Boolean} アップデートセッション中かどうか
		 * @memberOf DataModelManager
		 */
		beginUpdate: function() {
			if (this.isInUpdate()) {
				return;
			}

			this._updateLogs = {};
		},

		/**
		 * アップデートセッションを終了します。
		 * <p>
		 * アップデートセッション中でなければ何もしません。イベントの発火など詳細は<a href="#beginUpdate">beginUpdate()</a>の説明を参照してください。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModelManager
		 */
		endUpdate: function(_opt) {
			if (!this.isInUpdate()) {
				return;
			}
			// ObsArrayのchangeイベントをこのendUpdate内でdispatchするかどうか。
			// 変更があったObsArrayのイベントがbeginUpdateにより制御されていた場合はここでObsArrayのイベントをdispatchする必要がある。
			// 変更があったObsArrayのイベントがすでに実行されている場合はここで改めてdispatchする必要はい。
			// マネージャの_isArrayPropChangeSilentlyRequestedがtrueの場合は後者なので、ObsArrayのchangeイベントは上げない。
			var dispatchObsAryChange = !this._isArrayPropChangeSilentlyRequested;

			var updateLogs = this._updateLogs;
			var oldValueLogs = this._oldValueLogs;
			//_updateLog, _oldValueLogsをまず削除する。イベントハンドラ内で、値を変更された時に_updateLogをきちんと残せるようにするため。
			this._updateLogs = null;
			this._oldValueLogs = null;

			function getFirstCRLog(itemLogs, lastPos) {
				for (var i = 0; i < lastPos; i++) {
					var type = itemLogs[i].type;
					if ((type === UPDATE_LOG_TYPE_CREATE || type === UPDATE_LOG_TYPE_REMOVE)) {
						return itemLogs[i];
					}
				}
				return null;
			}

			/**
			 * 内部でDataItemごとのイベントを発火させます。 変更が1つでもあればモデルイベントオブジェクト(のひな形)を返しますが、変更がない場合はfalseを返します
			 */
			function createDataModelChanges(model, modelUpdateLogs) {
				var recreated = [];
				var created = [];
				var changed = [];
				var removed = [];

				for ( var itemId in modelUpdateLogs) {
					var itemLogs = modelUpdateLogs[itemId];
					var isChangeOnly = true;

					var changeEventStack = [];

					//新しい変更が後ろに入っているので、降順で履歴をチェックする
					for (var i = itemLogs.length - 1; i >= 0; i--) {
						var log = itemLogs[i]; //あるitemについてのログ
						var logType = log.type; //当該ログの種類

						if (logType === UPDATE_LOG_TYPE_CHANGE) {
							changeEventStack.push(log.ev);
						} else {
							//あるアイテムについての今回の変更のうち、最初に存在するCREATEまたはREMOVEのログ
							//(従って、changeのみの場合存在しない場合もある)
							var firstCRLog = getFirstCRLog(itemLogs, i);

							if (logType === UPDATE_LOG_TYPE_CREATE) {
								//begin->remove->create->end のような操作が行われた場合、
								//begin-endの前後でアイテムのインスタンスが変わってしまう。
								//これをイベントで判別可能にするため、remove->createだった場合はcreatedではなくrecreatedに入れる。
								//なお、begin->remove->create->remove->create->endのような場合、
								//途中のcreate->removeは（begin-endの外から見ると）無視してよいので、
								//oldItemには「最初のremoveのときのインスタンス」、newItemには「最後のcreateのときのインスタンス」が入る。
								//また、begin->create->remove->create->endの場合は、begin-endの外から見ると"create"扱いにすればよい。

								//なお、createイベントはDataItemからは発火しない。(createはdependプロパティ内でのみ起こる)

								if (firstCRLog && firstCRLog.type === UPDATE_LOG_TYPE_REMOVE) {
									recreated.push({
										id: itemId,
										oldItem: firstCRLog.item,
										newItem: log.item
									});
								} else {
									created.push(log.item);
								}
							} else {
								//ここに来たら必ずUPDATE_LOG_TYPE_REMOVE

								var removedItem;

								if (firstCRLog && firstCRLog.type === UPDATE_LOG_TYPE_REMOVE) {
									//begin->remove->create->remove->endの場合、begin-endの外から見ると
									//「最初のremoveで取り除かれた」という扱いにすればよい。
									removedItem = firstCRLog.item;
								} else if (!firstCRLog) {
									//createまたはremoveのログが最後のremoveより前にない
									//＝beginより前からアイテムが存在し、始めてremoveされた
									//＝通常のremoveとして扱う
									removedItem = log.item;
								} else {
									//begin->create-> ( remove->create-> ) remove -> end つまり
									//beginより前にアイテムがなく、セッション中に作られたが最終的には
									//またremoveされた場合、begin-endの外から見ると「何もなかった」と扱えばよい。
									removedItem = null;
								}

								if (removedItem) {
									removed.push(removedItem);

									var removeEvent = {
										type: 'remove',
										model: model
									};
									removedItem.dispatchEvent(removeEvent);
								}
							}

							isChangeOnly = false;

							//CREATEまたはREMOVEを見つけたら、そこで走査を終了
							break;
						}
					}

					//新規追加or削除の場合はcreated, removedに当該オブジェクトが入ればよい。
					//あるアイテムのcreate,removeどちらのログもなかったということは
					//そのオブジェクトはbeginの時点から存在しendのタイミングまで残っていた、ということになる。
					//従って、あとはchangeのイベントオブジェクトをマージすればよい。
					if (isChangeOnly && changeEventStack.length > 0) {
						var mergedProps = {};
						//changeEventStackはより「古い」イベントが「後ろ」に入っている。
						for (var i = changeEventStack.length - 1; i >= 0; i--) {
							for ( var p in changeEventStack[i].props) {
								if (!mergedProps[p]) {
									// oldValueのセット
									// type:[]ならmanager._oldValueLogsから持ってくる
									if (isObservableArray(model.get(itemId).get(p))) {
										var oldValue = oldValueLogs && oldValueLogs[model.name]
												&& oldValueLogs[model.name][itemId]
												&& oldValueLogs[model.name][itemId][p];
										if (!model.get(itemId).get(p).equals(oldValue)) {
											//プロパティがObservableArrayの場合、equalsの結果がfalseの場合のみ
											//mergedPropsにセットする。つまり、equalsがtrueの場合は「変更がなかった」ことになる。
											mergedProps[p] = {
												oldValue: oldValue
											};
										}
									} else {
										mergedProps[p] = {
											oldValue: changeEventStack[i].props[p].oldValue
										};
									}
								}
							}
						}
						// 今のアイテムがoldValueと違う値を持っていたらmergedPropsにnewValueをセット
						// 最終的に値が変わっているかどうかも同時にチェックする
						//oldValueは配列ならmanager._oldValueLogsにある
						var changedProps = false;
						for ( var p in mergedProps) {
							var oldValue = mergedProps[p].oldValue;
							var currentValue = model.get(itemId).get(p);
							if (oldValue === currentValue
									|| isBothStrictNaN(oldValue, currentValue)) {
								delete mergedProps[p];
							} else {
								var newValue = model.get(itemId).get(p);
								if (dispatchObsAryChange && isObservableArray(newValue)) {
									// ObservableArrayのイベントを上げる
									newValue.dispatchEvent({
										type: 'change',
										method: null,
										args: null,
										returnValue: null
									});
								}
								mergedProps[p].newValue = newValue;
								changedProps = true;
							}
						}
						if (changedProps) {
							var mergedChange = {
								type: 'change',
								target: changeEventStack[0].target,
								props: mergedProps
							};

							changed.push(mergedChange);

							mergedChange.target.dispatchEvent(mergedChange);
						}
					}
				}

				// 何も変更がなかった場合は、falseを返す
				if (created.length === 0 && recreated.length === 0 && removed.length === 0
						&& changed.length === 0) {
					return false;
				}
				return {
					created: created,
					recreated: recreated,
					removed: removed,
					changed: changed
				};
			}

			//endUpdateの処理フローここから

			var modelChanges = {};
			for ( var modelName in updateLogs) {
				if (!updateLogs.hasOwnProperty(modelName)) {
					continue;
				}
				var mc = createDataModelChanges(this.models[modelName], updateLogs[modelName]);
				if (mc) {
					modelChanges[modelName] = mc;
				}
			}

			//高速化のため、createDataModelChanges()の中で各DataItemからのイベントを発火させている

			//各DataModelからイベントを発火。
			//全てのモデルの変更が完了してから各モデルの変更イベントを出すため、同じループをもう一度行う
			var modelChanged = false;
			for ( var modelName in modelChanges) {
				modelChanged = true;
				var mc = modelChanges[modelName];
				this.models[modelName].dispatchEvent(createDataModelItemsChangeEvent(mc.created,
						mc.recreated, mc.removed, mc.changed));
			}

			var event = {
				type: EVENT_ITEMS_CHANGE,
				models: modelChanges
			};

			//最後に、マネージャから全ての変更イベントをあげる。変更がない場合は何もしない
			if (modelChanged) {
				this.dispatchEvent(event);
			}
		},

		_dataModelItemsChangeListener: function(event) {
			var manager = event.target.manager;

			var modelsChange = {};
			modelsChange[event.target.name] = event;

			var managerEvent = {
				type: EVENT_ITEMS_CHANGE,
				models: modelsChange
			};

			manager.dispatchEvent(managerEvent);
		}
	});

	/**
	 * 採番を行う<a href="Sequence.html">Sequence</a>インスタンスを作成します。
	 * <p>
	 * 自動でデータアイテムのナンバリングを行いたい場合などに使用します。
	 * </p>
	 * <p>
	 * 第一引数に開始番号(デフォルト1)、第二引数にステップ数(デフォルト1)、を指定します。
	 * </p>
	 * <p>
	 * 第三引数には戻り値の型を指定します。デフォルトはSEQ_INT（数値型）です。
	 * <ul>
	 * <li><a href="#SEQ_STRING">h5.core.data.SEQ_STRING</a>
	 * <li><a href="#SEQ_INT">h5.core.data.SEQ_INT</a>
	 * </ul>
	 * のいずれかを指定可能です。 SEQ_STRINGを指定した場合、<a href="Sequence.html#current">current()</a>や<a
	 * href="Sequence.html#next">next()</a> を呼ぶと、"1", "123"のような数字文字列が返ります。SEQ_INTの場合は数値が返ります。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @param {Number} [start=1] 開始番号
	 * @param {Number} [step=1] ステップ数
	 * @param {Integer} [returnType=2] 戻り値の型(デフォルト number)
	 */
	function createSequence(start, step, returnType) {
		// start,stepをdefault値で、returnTypeだけ指定したい場合、createSequence(null,null,returnType)で呼べるように、==nullで比較している
		var current = start != null ? start : 1;
		var theStep = step != null ? step : 1;

		function currentInt() {
			return current;
		}

		function nextInt() {
			var val = current;
			current += theStep;
			return val;
		}

		function currentString() {
			return current.toString();
		}

		function nextString() {
			var val = current;
			current += theStep;
			return val.toString();
		}

		var methods;
		if (returnType === SEQ_STRING) {
			methods = {
				current: currentString,
				next: nextString,
				returnType: SEQ_STRING
			};
		} else {
			methods = {
				current: currentInt,
				next: nextInt,
				returnType: SEQ_INT
			};
		}
		methods.setCurrent = function(value) {
			current = value;
		};

		/**
		 * 採番を行うためのクラス。
		 * <p>
		 * 自動でデータアイテムのナンバリングを行いたい場合などに使用します。このクラスは<a
		 * href="h5.core.data.html#createSequence">h5.core.data.createSequence()</a>で作成します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @class Sequence
		 */
		function Sequence() {
		// 空コンストラクタ
		}
		$.extend(Sequence.prototype, methods);

		return new Sequence();
	}

	//--------------------------------------------
	// DataModel
	//--------------------------------------------
	/**
	 * データモデル。 このクラスは直接newすることはできません。
	 * <p>
	 * <a href="DataModelManager.html#createModel">DataModelManager#createModel()</a>を呼ぶと、DataModelクラスを生成して返します。
	 * </p>
	 * <p>
	 * このクラスは<a href="EventDispatcher.html">EventDispatcher</a>のメソッドを持ちます。イベント関連のメソッドについては<a
	 * href="EventDispatcher.html">EventDispatcherミックスイン</a>を参照してください。<br>
	 * データモデルは、データモデルが管理するデータアイテムに変更があった場合に'itemsChange'イベントが発火します。
	 * </p>
	 *
	 * @since 1.1.0
	 * @class
	 * @mixes EventDispatcher
	 * @name DataModel
	 */
	/**
	 * @private
	 * @param {Object} schema チェック済みかつextendSchema済みのschema
	 * @param {Object} descriptor チェック済み
	 * @param {Object} itemValueCheckFuncs 値のチェック関数
	 * @param {DataModelManager} manager
	 */
	function DataModel(schema, descriptor, itemValueCheckFuncs, manager) {

		/**
		 * データモデルが持つデータアイテムを持つオブジェクト。
		 * <p>
		 * データアイテムのidをキー、データアイテムインスタンスを値、として保持します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @type Object
		 * @name items
		 */
		this.items = {};

		/**
		 * データモデルが持つデータアイテムの数
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @type Integer
		 * @name size
		 */
		this.size = 0;

		/**
		 * データモデル名
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @type String
		 * @name name
		 */
		this.name = descriptor.name;

		/**
		 * このデータモデルが属しているデータマネージャインスタンス。<br>
		 *
		 * @private
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @type Object
		 * @name _manager
		 */
		this._manager = manager;

		//TODO sequence対応は後日
		//this.idSequence = 0;

		// idプロパティの設定
		// スキーマはチェック済みなのでid指定されているプロパティは必ず一つだけある。
		for ( var p in schema) {
			if (schema[p] && schema[p].id) {
				this._idKey = p;
			}
		}
		var schemaIdType = schema[this._idKey].type;
		if (schemaIdType) {
			if (schemaIdType === 'string') {
				this._idType = ID_TYPE_STRING;
			} else {
				this._idType = ID_TYPE_INT;
			}
		} else {
			this._idType = ID_TYPE_STRING;
		}

		/**
		 * 継承関係計算済みのスキーマ
		 *
		 * @name schema
		 * @since 1.1.0
		 * @type {Object}
		 * @memberOf DataModel
		 */
		this.schema = schema;

		/**
		 * このデータモデルに対応するデータアイテムのコンストラクタ関数
		 *
		 * @private
		 * @since 1.1.0
		 * @type function
		 * @memberOf DataModel
		 */
		this._itemConstructor = createDataItemConstructor(schema, itemValueCheckFuncs, this);

		// manager.modelsに自身を登録
		manager.models[this.name] = this;
	}

	// EventDispatcherをミックスイン
	h5.mixin.eventDispatcher.mix(DataModel.prototype);
	$.extend(DataModel.prototype, {
		/**
		 * 指定されたIDと初期値がセットされたデータアイテムを生成します。
		 * <p>
		 * データアイテムはこのデータモデルに紐づけられた状態になっています。
		 * </p>
		 * <p>
		 * 指定されたIDのデータアイテムがすでにこのデータモデルに存在した場合は、 既に存在するデータアイテムを返します（新しいインスタンスは生成されません）。
		 * </p>
		 * <p>
		 * 従って、1つのデータモデルは、1IDにつき必ず1つのインスタンスだけを保持します。
		 * なお、ここでIDの他に初期値も渡された場合は、既存のインスタンスに初期値をセットしてから返します。
		 * このとき、当該インスタンスにイベントハンドラが設定されていれば、changeイベントが（通常の値更新と同様に）発生します。
		 * </p>
		 * <p>
		 * 引数にはディスクリプタオブジェクトまたはその配列を指定します。ディスクリプタオブジェクトについては<a
		 * href="/conts/web/view/tutorial-data-model/descriptor">チュートリアル(データモデル編)&gt;&gt;ディスクリプタの書き方</a>をご覧ください。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @param {Object|Object[]} objOrArray ディスクリプタオブジェクト、またはその配列
		 * @returns {DataItem|DataItem[]} データアイテム、またはその配列
		 */
		create: function(objOrArray) {
			// modelがmanagerを持たない(dropModelされた)ならエラー
			if (!this._manager) {
				throwFwError(ERR_CODE_CANNOT_CHANGE_DROPPED_MODEL, [this.name, 'create']);
			}
			var error = this.validate(objOrArray, true);
			if (error) {
				throw error;
			}

			//removeで同時に複数のアイテムが指定された場合、イベントは一度だけ送出する。
			//そのため、事前にアップデートセッションに入っている場合はそのセッションを引き継ぎ、
			//入っていない場合は一時的にセッションを作成する。
			var isAlreadyInUpdate = this._manager ? this._manager.isInUpdate() : false;

			if (!isAlreadyInUpdate) {
				this._manager.beginUpdate();
			}
			var actualNewItems = [];
			var items = wrapInArray(objOrArray);
			var ret = [];
			var idKey = this._idKey;
			for (var i = 0, len = items.length; i < len; i++) {
				var valueObj = items[i];
				var itemId = valueObj[idKey];

				var storedItem = this._findById(itemId);
				if (storedItem) {
					//返す値にstoredItemを追加
					ret.push(storedItem);

					// 既に存在するオブジェクトの場合は値を更新。ただし、valueObjのIDフィールドは無視（上書きなので問題はない）
					var event = itemSetter(storedItem, valueObj, [idKey]);
					if (!event) {
						//itemSetterが何も返さなかった = 更新する値が何もない
						continue;
					}

					addUpdateChangeLog(this, event);
				} else {
					var newItem = new this._itemConstructor(valueObj);

					this.items[itemId] = newItem;
					this.size++;

					actualNewItems.push(newItem);
					ret.push(newItem);
				}
			}

			if (actualNewItems.length > 0) {
				addUpdateLog(this, UPDATE_LOG_TYPE_CREATE, actualNewItems);
			}

			if (!isAlreadyInUpdate) {
				//既存のアイテムが変更されていればアイテムのイベントを上げる
				this._manager.endUpdate();
			}

			if (isArray(objOrArray)) {
				return ret;
			}
			return ret[0];
		},

		/**
		 * このモデルのスキーマに違反しないかどうかオブジェクトをチェックします。
		 * <p>
		 * 第一引数にはチェックしたいオブジェクト、またはチェックしたいオブジェクトの配列を渡してください。
		 * </p>
		 * <p>
		 * 例：
		 *
		 * <pre>
		 * dataModel.validate({
		 * 	prop1: 5,
		 * 	prop2: 'abc'
		 * });
		 * </pre>
		 *
		 * </p>
		 * <p>
		 * チェックが通らなかった場合は例外オブジェクト、チェックが通った場合はnullを返します
		 * </p>
		 * <p>
		 * 第二引数にtrueを指定した場合は、create()時相当のバリデーションを行います。create()時相当のバリデーションではid指定があるかどうかのチェックがあり、
		 * 引数に未指定のプロパティがあれば初期値の設定をしてからバリデーションを行います。デフォルトはfalseで、set()時相当のスキーマチェックのみを行います。
		 * </p>
		 * <p>
		 * id項目へのセット、depend項目へのセットのチェック及び、depend項目の計算結果のチェック(depend.calcの実行)は行いません。
		 * id項目、depend項目はセットできるかどうかは、セット時のデータアイテムの値に依存するため、validate時にはチェックしません。
		 * depend.calcはその時のデータアイテムに依存したり、副作用のある関数が指定されている場合を考慮し、validate時には実行しません。
		 * </p>
		 *
		 * @since 1.1.9
		 * @memberOf DataModel
		 * @param {Object|Object[]} value チェックしたいオブジェクトまたはオブジェクトの配列
		 * @param {Boolean} [asCreate=false] create()時相当のバリデーションを行うかどうか
		 */
		validate: function(value, asCreate) {
			try {
				var idKey = this._idKey;
				var items = wrapInArray(value);
				// objctでもArrayでもなかったらエラー
				if (typeof value !== 'object' && !isArray(value)) {
					throwFwError(ERR_CODE_INVALID_CREATE_ARGS);
				}
				if (asCreate) {
					for (var i = 0, len = items.length; i < len; i++) {
						var valueObj = items[i];
						var itemId = valueObj[idKey];
						//idが空文字、null、undefined、はid指定エラー
						if (itemId === '' || itemId == null) {
							throwFwError(ERR_CODE_NO_ID, [this.name, idKey]);
						}

						// validateする
						// 新規作成時のチェックなら初期値をセットしてからチェックを実行
						var obj = this._schemaInfo._createInitialValueObj(valueObj);
						validateValueObj(this.schema, this._schemaInfo._validateItemValue, obj,
								this);
					}
				} else {
					for (var i = 0, l = items.length; i < l; i++) {
						var valueObj = items[i];
						validateValueObj(this.schema, this._schemaInfo._validateItemValue,
								valueObj, this);
					}
				}
			} catch (e) {
				return e;
			}
			return null;
		},

		/**
		 * 指定されたIDのデータアイテムを返します。
		 * <p>
		 * 当該IDを持つアイテムをこのデータモデルが保持していない場合はnullを返します。 引数にIDの配列を渡した場合に一部のIDのデータアイテムが存在しなかった場合、
		 * 戻り値の配列の対応位置にnullが入ります。
		 * </p>
		 * <p>
		 * （例：get(['id1', 'id2', 'id3']) でid2のアイテムがない場合、戻り値は [item1, null, item3] のようになる ）
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @param {String|String[]} idOrArray ID、またはその配列
		 * @returns {DataItem|DataItem[]} データアイテム、またはその配列
		 */
		get: function(idOrArray) {
			if (isArray(idOrArray) || h5.core.data.isObservableArray(idOrArray)) {
				var ret = [];
				for (var i = 0, len = idOrArray.length; i < len; i++) {
					ret.push(this._findById(idOrArray[i]));
				}
				return ret;
			}
			//引数の型チェックはfindById内で行われる
			return this._findById(idOrArray);
		},

		/**
		 * 指定されたIDのデータアイテムをこのデータモデルから削除します。
		 * <p>
		 * 当該IDを持つアイテムをこのデータモデルが保持していない場合はnullを返します。 引数にIDの配列を渡した場合に一部のIDのデータアイテムが存在しなかった場合、
		 * 戻り値の配列の対応位置にnullが入ります。 （例：remove(['id1', 'id2', 'id3']) でid2のアイテムがない場合、 戻り値は [item1,
		 * null, item3]のようになります。） 引数にID(文字列)またはデータアイテム以外を渡した場合はnullを返します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @param {String|DataItem|String[]|DataItem[]} objOrItemIdOrArray 削除するデータアイテム
		 * @returns {DataItem|DataItem[]} 削除したデータアイテム
		 */
		remove: function(objOrItemIdOrArray) {
			// modelがmanagerを持たない(dropModelされた)ならエラー
			if (!this._manager) {
				throwFwError(ERR_CODE_CANNOT_CHANGE_DROPPED_MODEL, [this.name, 'remove']);
			}

			//removeで同時に複数のアイテムが指定された場合、イベントは一度だけ送出する。
			//そのため、事前にアップデートセッションに入っている場合はそのセッションを引き継ぎ、
			//入っていない場合は一時的にセッションを作成する。
			var isAlreadyInUpdate = this._manager ? this._manager.isInUpdate() : false;
			if (!isAlreadyInUpdate) {
				this._manager.beginUpdate();
			}

			var idKey = this._idKey;
			var ids = wrapInArray(objOrItemIdOrArray);

			var actualRemovedItems = [];
			var ret = [];

			for (var i = 0, len = ids.length; i < len; i++) {
				if (!this.has(ids[i])) {
					//指定されたアイテムが存在しない場合はnull
					ret.push(null);
					continue;
				}

				var id = (isString(ids[i]) || isIntegerValue(ids[i], true)) ? ids[i]
						: ids[i]._values[idKey];

				var item = this.items[id];

				delete this.items[id];

				this.size--;

				ret.push(item);
				if (item._model) {
					// 削除されたフラグを立てる
					item._isRemoved = true;
				}
				actualRemovedItems.push(item);
			}

			if (actualRemovedItems.length > 0) {
				addUpdateLog(this, UPDATE_LOG_TYPE_REMOVE, actualRemovedItems);
			}

			if (!isAlreadyInUpdate) {
				this._manager.endUpdate();
			}

			if (isArray(objOrItemIdOrArray)) {
				return ret;
			}
			return ret[0];
		},

		/**
		 * 保持しているすべてのデータアイテムを削除します。
		 *
		 * @since 1.1.3
		 * @memberOf DataModel
		 * @returns {DataItem[]} 削除されたデータアイテム。順序は不定です。
		 */
		removeAll: function() {
			var items = this.toArray();
			if (items.length > 0) {
				this.remove(items);
			}
			return items;
		},

		/**
		 * 指定されたデータアイテムを保持しているかどうかを返します。
		 * <p>
		 * 文字列または整数値が渡された場合はIDとみなし、 オブジェクトが渡された場合はデータアイテムとみなします。
		 * オブジェクトが渡された場合、自分が保持しているデータアイテムインスタンスかどうかをチェックします。
		 * </p>
		 * <p>
		 * 従って、同じ構造を持つ別のインスタンスを引数に渡した場合はfalseが返ります。
		 * データアイテムインスタンスを引数に渡した場合に限り（そのインスタンスをこのデータモデルが保持していれば）trueが返ります。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @param {String|Object} idOrObj ID文字列またはデータアイテムオブジェクト
		 * @returns {Boolean} 指定されたIDのデータアイテムをこのデータモデルが保持しているかどうか
		 */
		has: function(idOrObj) {
			if (isString(idOrObj) || isIntegerValue(idOrObj, true)) {
				return !!this._findById(idOrObj);
			} else if (typeof idOrObj === 'object') {
				//型の厳密性はitemsとの厳密等価比較によってチェックできるので、if文ではtypeofで充分
				return idOrObj != null && isFunction(idOrObj.get)
						&& idOrObj === this.items[idOrObj.get(this._idKey)];
			} else {
				return false;
			}
		},

		/**
		 * このモデルが属しているマネージャを返します。
		 * <p>
		 * dropModelされたモデルの場合はnullを返します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @returns {DataManager} このモデルが属しているマネージャ
		 */
		getManager: function() {
			return this._manager;
		},

		/**
		 * 指定されたIDのデータアイテムを返します。 アイテムがない場合はnullを返します。
		 *
		 * @private
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @param {String} id データアイテムのID
		 * @returns {DataItem} データアイテム、存在しない場合はnull
		 */
		_findById: function(id) {
			var item = this.items[id];
			return typeof item === TYPE_OF_UNDEFINED ? null : item;
		},

		/**
		 * 引数で指定されたchangeイベントに基づいて、itemsChangeイベントを即座に発火させます。
		 *
		 * @private
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @param {Object} event DataItemのchangeイベント
		 */
		_dispatchItemsChangeEvent: function(event) {
			var modelEvent = createDataModelItemsChangeEvent([], [], [], [event]);
			this.dispatchEvent(modelEvent);

			// managerがあれば(dropされたモデルでなければ)managerのイベントを発火
			if (this._manager) {
				modelEvent.target = this;
				this._manager._dataModelItemsChangeListener(modelEvent);
			}
		},

		/**
		 * データモデルが持つデータアイテムを配列に詰めて返します。 配列中のデータアイテムの順番は不定です。
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @returns {Array} モデルが持つデータアイテムが格納された配列
		 */
		toArray: function() {
			var ret = [];
			var items = this.items;
			for ( var id in items) {
				if (items.hasOwnProperty(id)) {
					ret.push(items[id]);
				}
			}
			return ret;
		},

		/**
		 * このデータモデルについてデータアイテムの検索を行うQueryクラスを作成して返します
		 *
		 * @since 1.2.0
		 * @memberOf DataModel
		 * @returns {Query} 検索を行うQueryクラスを返します
		 */
		createQuery: h5internal.data.createQuery
	});

	//------------------------------------------
	// DataItem
	//------------------------------------------

	/**
	 * propで指定されたプロパティのプロパティソース(データアイテムのコンストラクタ)を作成します。
	 *
	 * @private
	 * @param {Object} schemaInfo チェック済みスキーマ
	 * @param {Object} itemValuCheckFuncs 値チェック関数を持つオブジェクト。
	 * @param {DataModel} [model] データモデルオブジェクト
	 */
	function createDataItemConstructor(schema, itemValueCheckFuncs, model) {
		// スキーマ情報の作成。アイテムのプロトタイプとモデルに持たせる。
		var schemaInfo = createSchemaInfoCache(schema, itemValueCheckFuncs);
		model._schemaInfo = schemaInfo;

		/**
		 * データアイテムクラス
		 * <p>
		 * データアイテムは<a href="DataModel.html#create">DataModel#create()</a>で作成します。
		 * </p>
		 * <p>
		 * このクラスは<a href="EventDispatcher.html">EventDispatcher</a>のメソッドを持ちます。イベント関連のメソッドについては<a
		 * href="EventDispatcher.html">EventDispatcherミックスイン</a>を参照してください。<br>
		 * データアイテムは、アイテムが持つ値に変更があった場合に'change'イベントが発火します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @class
		 * @mixes EventDispatcher
		 * @name DataItem
		 */
		/**
		 * @private
		 * @param {Object} userInitialValue ユーザー指定の初期値
		 */
		function DataItem(userInitialValue) {
			initItem(this, schema, schemaInfo, userInitialValue);

			// 初期値の設定
			var actualInitialValue = schemaInfo._createInitialValueObj(userInitialValue);
			validateValueObj(schema, schemaInfo._validateItemValue, actualInitialValue, model);
			itemSetter(this, actualInitialValue, null, true);

			// arrayPropsの設定
			var arrayProps = schemaInfo._aryProps;

			// ObservableArrayのイベントリスナの設定を行う
			for (var i = 0, l = arrayProps.length; i < l; i++) {
				setObservableArrayListeners(this, arrayProps[i], this.get(arrayProps[i]), model);
			}
		}

		// EventDispatcherをミックスイン
		h5.mixin.eventDispatcher.mix(DataItem.prototype);
		// EventDispatcherと、schemaInfoもprototypeに追加する
		$.extend(DataItem.prototype, schemaInfo, itemProto, {

			/**
			 * データアイテムが属しているデータモデル
			 *
			 * @private
			 * @since 1.1.0
			 * @memberOf DataItem
			 */
			_model: model,

			/**
			 * データアイテムがモデルからremoveされたかどうか
			 *
			 * @private
			 * @memberOf DataItem
			 */
			_isRemoved: false,

			/**
			 * DataItemが属しているDataModelインスタンスを返します。
			 * <p>
			 * このメソッドは、DataModelから作成したDataItemのみが持ちます。createObservableItemで作成したアイテムにはこのメソッドはありません。
			 * DataModelに属していないDataItem(removeされたDataItem)から呼ばれた場合はnullを返します。
			 * </p>
			 *
			 * @since 1.1.0
			 * @memberOf DataItem
			 * @returns {DataModel} 自分が所属するデータモデル
			 */
			getModel: function() {
				return this._isRemoved ? null : this._model;
			}
		});
		return DataItem;
	}

	// ------------------------
	// ObservableItem
	// ------------------------
	/**
	 * オブザーバブルアイテムクラス
	 * <p>
	 * オブザーバブルアイテムは<a
	 * href="h5.core.data.html#createObservableItem">h5.core.data.html#createObservableItem</a>で作成します。
	 * </p>
	 * <p>
	 * このクラスは<a href="DataItem.html">DataItemクラス</a>のメソッドを持ちます。
	 * </p>
	 *
	 * @since 1.1.0
	 * @class
	 * @mixes EventDispatcher
	 * @name ObservableItem
	 */
	function ObservableItem(item) {
	// 空コンストラクタ
	}
	// EventDispatcherをミックスイン
	h5.mixin.eventDispatcher.mix(ObservableItem.prototype);
	$.extend(ObservableItem.prototype, itemProto, {
		/**
		 * ObservableItemのスキーマに違反しないかどうか引数をチェックします。
		 * <p>
		 * チェックが通らなかった場合は例外オブジェクト、チェックが通った場合はnullを返します
		 * </p>
		 * <p>
		 * このメソッドはh5.core.data.createObservableItem()で作成したObservableItemのみが持ちます。DataModelから作成したDataItemにはこのメソッドはありません。
		 * DataModelから作成したDataItemの値チェックは、<a href="DataModel.html#validate">DataModel#validate</a>を使用してください。
		 * </p>
		 *
		 * @since 1.1.9
		 * @memberOf ObservableItem
		 * @param {Any} var_args 複数のキー・値のペアからなるオブジェクト、または1組の(キー, 値)を2つの引数で取ります。
		 */
		validate: function(var_args) {
			try {
				//引数はオブジェクト1つ、または(key, value)で呼び出せる
				var valueObj = var_args;
				if (arguments.length === 2) {
					valueObj = {};
					valueObj[arguments[0]] = arguments[1];
				}
				validateValueObj(this.schema, this._validateItemValue, valueObj);
			} catch (e) {
				return e;
			}
			return null;
		}
	});

	/**
	 * ObservableItemを作成します。
	 * <p>
	 * ObservableItemは、データモデルに属さない<a href="DataItem.html"/>DataItem</a>です。DataItemと同様にEventDispatcherクラスのメソッドを持ちます。
	 * </p>
	 * <p>
	 * 引数にはスキーマオブジェクトを指定します。スキーマオブジェクトとは、ディスクリプタオブジェクトのschemaプロパティに指定するオブジェクトのことです。
	 * </p>
	 * <p>
	 * ディスクリプタオブジェクトについては<a
	 * href="/conts/web/view/tutorial-data-model/descriptor">チュートリアル(データモデル編)&gt;&gt;ディスクリプタの書き方</a>をご覧ください。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @param {Object} schema スキーマオブジェクト
	 * @returns {ObservableItem} ObservableItemインスタンス
	 */
	function createObservableItem(schema) {
		// 値チェックに必要な情報を取得してitemに持たせる
		validateSchema(schema, false, null, true);
		var itemValueCheckFuncs = createValueCheckFuncsBySchema(schema);
		validateDefaultValue(schema, itemValueCheckFuncs, true);

		var obsItem = new ObservableItem();

		// スキーマ情報の作成。アイテムに持たせる。
		var schemaInfo = createSchemaInfoCache(schema, itemValueCheckFuncs);

		// obsItemのセットアップ
		initItem(obsItem, schema, schemaInfo);

		// schemaを持たせる
		obsItem.schema = schema;
		// schemaInfoの中身を持たせる
		for ( var p in schemaInfo) {
			obsItem[p] = schemaInfo[p];
		}
		// 初期値の設定
		var actualInitialValue = schemaInfo._createInitialValueObj();
		validateValueObj(schema, schemaInfo._validateItemValue, actualInitialValue);
		itemSetter(obsItem, actualInitialValue, null, true);

		// ObservableArrayのアイテムについてリスナの設定
		for (var i = 0, l = obsItem._aryProps.length; i < l; i++) {
			setObservableArrayListeners(obsItem, obsItem._aryProps[i], obsItem
					.get(obsItem._aryProps[i]));
		}

		return obsItem;
	}

	/**
	 * ObserevableItem(createObservableItemで作成したオブジェクト)かどうかを判定します。
	 * <p>
	 * DataModelから作成したDataItemの場合はfalseを返します。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @returns {Boolean} ObservableItemかどうか
	 */
	function isObservableItem(obj) {
		// _validateItemValueを持っているかつ、getModelメソッドがない場合はObservableItemと判定する。
		return !!(obj && obj.constructor && obj._validateItemValue && !isFunction(obj.getModel));
	}

	//--------------------------------------------
	// ObservableArray
	//--------------------------------------------
	/**
	 * ObservableArray(オブザーバブルアレイ)とは、通常の配列と同じAPIを持ち操作を外部から監視できる、配列とほぼ同じように利用可能なクラスです。
	 * DOM要素のようにaddEventListenerでリスナーをセットすることで、配列に対するメソッド呼び出しをフックすることができます。
	 * <p>
	 * <a href="h5.core.data.html#createObservableArray">h5.core.data.createObservableArray()</a>で作成します。
	 * </p>
	 * <p>
	 * 通常の配列と同様の操作に加え、要素の追加、削除、変更についての監視ができます。
	 * </p>
	 * <p>
	 * Arrayクラスの持つメソッド(concat, join, pop, push, reverse, shift, slice, sort, splice, unshift,
	 * indexOf, lastIndexOf, every, filter, forEach, map, some, reduce, reduceRight)が使えます。
	 * </p>
	 * <p>
	 * このクラスは<a href="EventDispatcher.html">EventDispatcher</a>のメソッドを持ちます。イベント関連のメソッドについては<a
	 * href="EventDispatcher.html">EventDispatcherミックスイン</a>を参照してください。<br>
	 * ObservableArrayは、自身の内容が変更されるメソッドが呼び出される時、実行前に'changeBefore'、実行後に'change'イベントを発生させます。
	 * </p>
	 *
	 * @since 1.1.0
	 * @class
	 * @mixes EventDispatcher
	 * @name ObservableArray
	 */
	function ObservableArray() {
		/**
		 * 配列の長さを表します。このプロパティは読み取り専用で使用してください
		 *
		 * @since 1.1.0
		 * @name length
		 * @memberOf ObservableArray
		 * @type Number
		 */
		this.length = 0;

		this._src = [];
	}
	// EventDispatcherをミックスイン
	h5.mixin.eventDispatcher.mix(ObservableArray.prototype);

	//ObservableArrayの関数はフックされるので、直接prototypeに置かない
	var obsFuncs = {
		/**
		 * この配列が、引数で指定された配列と同じ内容か比較します。<br>
		 * 要素にNaN定数が入っている場合、同一位置にともにNaNが入っているかどうかをisNaN()関数でチェックします。
		 * （obsArrayの内容が[NaN]のとき、obsArray.equals([NaN])）はtrueになります。
		 *
		 * @since 1.1.0
		 * @memberOf ObservableArray
		 * @param {ObservableArray|Array} ary ObservableArrayまたはArray型の配列
		 * @returns {Boolean} 判定結果
		 */
		equals: function(ary) {
			var isObservable = isObservableArray(ary);
			if (!isObservable && !isArray(ary)) {
				// ObservableArrayでもArrayでもないならfalseを返す
				return false;
			}

			var target = isObservable ? ary._src : ary;
			var len = this.length;
			var targetLength = target.length;

			// サイズが異なる場合はfalseを返す
			// target(ネイティブの配列)のlengthと比較する。
			// (iOS8.0で、ObsArrayのlengthとネイティブのArrayのlengthを比較すると比較結果がおかしくなることがある(#issue 404))
			if (targetLength !== len) {
				return false;
			}

			// 中身の比較
			for (var i = 0; i < len; i++) {
				var myVal = this[i];
				var targetVal = target[i];

				if (!(myVal === targetVal || isBothStrictNaN(myVal, targetVal))) {
					return false;
				}
			}
			return true;
		},

		/**
		 * 指定された配列の要素をこのObservableArrayにシャローコピーします。
		 * <p>
		 * 元々入っていた値は全て削除され、呼び出し後は引数で指定された配列と同じ要素を持ちます。
		 * </p>
		 * 引数がnullまたはundefinedの場合は、空配列が渡された場合と同じ挙動をします（自身の要素が全て削除されます）
		 *
		 * @since 1.1.0
		 * @memberOf ObservableArray
		 * @param {Array} src コピー元の配列
		 */
		copyFrom: function(src) {
			if (src == null) {
				//srcがnullの場合は空配列と同じ挙動にする
				src = [];
			}

			src = isObservableArray(src) ? src._src : src;

			if (!isArray(src)) {
				//引数が配列でない場合はエラー
				throwFwError(ERR_CODE_INVALID_COPYFROM_ARGUMENT, [0, src]);
			}

			var args = src.slice(0);
			args.unshift(0, this.length);
			Array.prototype.splice.apply(this, args);
		},

		/**
		 * 値を取得します
		 *
		 * @since 1.1.3
		 * @memberOf ObservableArray
		 * @param {Number} index 取得する要素のインデックス
		 * @returns 要素の値
		 */
		get: function(index) {
			return this[index];
		},

		/**
		 * 値をセットします
		 *
		 * @since 1.1.3
		 * @memberOf ObservableArray
		 * @param {Number} index 値をセットする要素のインデックス
		 */
		set: function(index, value) {
			this[index] = value;
		},

		/**
		 * 現在のObservableArrayインスタンスと同じ要素を持ったネイティブ配列インスタンスを返します
		 *
		 * @since 1.1.3
		 * @memberOf ObservableArray
		 * @returns ネイティブ配列インスタンス
		 */
		toArray: function() {
			return this.slice(0);
		},

		/**
		 * 動作は通常の配列のconcatと同じです。<br>
		 * 引数にObservableArrayが渡された場合にそれを通常の配列とみなして動作するようラップされています
		 *
		 * @since 1.1.3
		 * @memberOf ObservableArray
		 * @returns 要素を連結したObservableArrayインスタンス
		 */
		concat: function() {
			var args = h5.u.obj.argsToArray(arguments);
			for (var i = 0, len = args.length; i < len; i++) {
				if (isObservableArray(args[i])) {
					args[i] = args[i].toArray();
				}
			}
			return this.concat.apply(this, args);
		}
	};

	//Array.prototypeのメンバーはfor-inで列挙されないためここで列挙。
	//プロパティアクセスのProxyingが可能になれば不要になるかもしれない。
	var arrayMethods = ['concat', 'join', 'pop', 'push', 'reverse', 'shift', 'slice', 'sort',
			'splice', 'unshift', 'indexOf', 'lastIndexOf', 'every', 'filter', 'forEach', 'map',
			'some', 'reduce', 'reduceRight'];
	for ( var obsFuncName in obsFuncs) {
		if (obsFuncs.hasOwnProperty(obsFuncName) && $.inArray(obsFuncName, arrayMethods) === -1) {
			arrayMethods.push(obsFuncName);
		}
	}

	// 戻り値として配列を返すので戻り値をラップする必要があるメソッド（従ってtoArrayは含めない）
	var creationMethods = ['concat', 'slice', 'splice', 'filter', 'map'];

	//戻り値として自分自身を返すメソッド
	var returnsSelfMethods = ['reverse', 'sort'];

	// 破壊的(副作用のある)メソッド
	var destructiveMethods = ['sort', 'reverse', 'pop', 'shift', 'unshift', 'push', 'splice',
			'copyFrom', 'set'];

	for (var i = 0, len = arrayMethods.length; i < len; i++) {
		var arrayMethod = arrayMethods[i];
		ObservableArray.prototype[arrayMethod] = (function(method) {
			var func = obsFuncs[method] ? obsFuncs[method] : Array.prototype[method];

			function doProcess() {
				var ret = func.apply(this._src, arguments);

				if ($.inArray(method, returnsSelfMethods) !== -1) {
					//自分自身を返すメソッドの場合
					ret = this;
				} else if ($.inArray(method, creationMethods) !== -1) {
					//新しい配列を生成するメソッドの場合
					var wrapper = createObservableArray();
					wrapper.copyFrom(ret);
					ret = wrapper;
				}

				return ret;
			}

			if ($.inArray(method, destructiveMethods) === -1) {
				//非破壊メソッドの場合
				return doProcess;
			}

			//破壊メソッドの場合は、changeBefore/changeイベントを出す

			//TODO fallback実装の提供?(優先度低)
			return function() {
				var evBefore = {
					type: 'changeBefore',
					method: method,
					args: arguments
				};

				if (!this.dispatchEvent(evBefore)) {
					//preventDefault()が呼ばれなければ実際に処理を行う
					var ret = doProcess.apply(this, arguments);

					this.length = this._src.length;

					var evAfter = {
						type: 'change',
						method: method,
						args: arguments,
						returnValue: ret
					};
					this.dispatchEvent(evAfter);
					return ret;
				}
			};
		})(arrayMethod);
	}


	/**
	 * ObservableArrayを作成します
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @returns {ObservableArray} ObservableArrayインスタンス
	 */
	function createObservableArray() {
		return new ObservableArray();
	}

	/**
	 * ObservableArrayかどうかを判定します
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @returns {Boolean} ObservableArrayかどうか
	 */
	function isObservableArray(obj) {
		if (obj && obj.constructor === ObservableArray) {
			return true;
		}
		return false;
	}
	// =============================
	// Expose to window
	// =============================
	/**
	 * @namespace
	 * @name data
	 * @memberOf h5.core
	 */
	h5.u.obj.expose('h5.core.data', {
		createManager: createManager,
		createObservableArray: createObservableArray,
		createObservableItem: createObservableItem,
		isObservableArray: isObservableArray,
		isObservableItem: isObservableItem,
		createSequence: createSequence,
		SEQ_STRING: SEQ_STRING,
		SEQ_INT: SEQ_INT
	});
})();
/* ------ h5.core.view ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/**
	 * EJSにスクリプトレットの区切りとして認識させる文字
	 */
	var DELIMITER = '[';

	// エラーコード
	/**
	 * コンパイルしようとしたテンプレートが文字列でない
	 */
	var ERR_CODE_TEMPLATE_COMPILE_NOT_STRING = 7000;

	/**
	 * テンプレートIDが不正である時に発生するエラー
	 */
	var ERR_CODE_TEMPLATE_INVALID_ID = 7002;

	/**
	 * load()呼び出し時に引数にファイル名またはファイル名の配列が渡されなかった時に発生するエラー
	 */
	var ERR_CODE_INVALID_FILE_PATH = 7004;

	/**
	 * 登録されていないテンプレートIDを指定したときに発生するエラー
	 */
	var ERR_CODE_TEMPLATE_ID_UNAVAILABLE = 7005;

	/**
	 * テンプレートに渡すパラメータに必要なプロパティが設定されていない時に発生するエラー
	 */
	var ERR_CODE_TEMPLATE_PROPATY_UNDEFINED = 7006;

	/**
	 * bindに指定されたターゲットが不正(非DOM要素またはセレクタで指定された要素が存在しない)な場合に発生するエラー
	 */
	var ERR_CODE_BIND_INVALID_TARGET = 7007;

	/**
	 * bindに指定したtargetが表すDOM要素が複数あるならエラー
	 */
	var ERR_CODE_TOO_MANY_TARGETS = 7008;

	/**
	 * bindに指定したcontextがオブジェクトでない
	 */
	var ERR_CODE_BIND_CONTEXT_INVALID = 7009;

	/**
	 * テンプレートのコンパイルエラー
	 */
	var ERR_CODE_TEMPLATE_COMPILE_SYNTAX_ERR = 7010;

	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.core.view');

	/* del begin */
	var FW_LOG_TEMPLATE_NOT_REGISTERED = '指定されたIDのテンプレートは登録されていません。"{0}"';
	var FW_LOG_TEMPLATE_OVERWRITE = 'テンプレートID:{0} は上書きされました。';

	/**
	 * 各エラーコードに対応するメッセージ
	 */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_TEMPLATE_COMPILE_NOT_STRING] = 'テンプレートのコンパイルでエラーが発生しました。テンプレートには文字列を指定してください。';
	// ERR_CODE_INVALID_IDのエラーのメッセージはh5.resで登録済みなのでここで再度登録はしない
	// (ejsファイル解析時のid不正と、get()の引数のid不正が同じエラーであるため、res,viewで両方使用している)
	//	errMsgMap[ERR_CODE_TEMPLATE_INVALID_ID] = 'テンプレートIDが指定されていません。空や空白でない文字列で指定してください。';
	errMsgMap[ERR_CODE_INVALID_FILE_PATH] = 'テンプレートファイルの指定が不正です。空や空白でない文字列、または文字列の配列で指定してください。';
	errMsgMap[ERR_CODE_TEMPLATE_ID_UNAVAILABLE] = 'テンプレートID:{0} テンプレートがありません。';
	errMsgMap[ERR_CODE_TEMPLATE_PROPATY_UNDEFINED] = '{0} テンプレートにパラメータが設定されていません。';
	errMsgMap[ERR_CODE_BIND_INVALID_TARGET] = 'bindの引数に指定されたターゲットが存在しないかまたは不正です。';
	errMsgMap[ERR_CODE_TOO_MANY_TARGETS] = 'bindの引数に指定されたバインド先の要素が2つ以上存在します。バインド対象は1つのみにしてください。';
	errMsgMap[ERR_CODE_BIND_CONTEXT_INVALID] = 'bindの引数に指定されたルートコンテキストが不正です。オブジェクト、データアイテム、またはObservableItemを指定してください。';
	errMsgMap[ERR_CODE_TEMPLATE_COMPILE_SYNTAX_ERR] = 'テンプレートのコンパイルでエラーが発生しました。構文エラー：{0} {1}';

	// メッセージの登録
	addFwErrorCodeMap(errMsgMap);
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	var getDeferred = h5.async.deferred;

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	// =============================
	// Variables
	// =============================

	/**
	 * EJSテンプレート内で使用可能なヘルパー関数を格納するオブジェクト
	 */
	var helperExtras = {

		/**
		 * HTML文字列をエスケープします。
		 *
		 * @param {String} str エスケープ対象文字列
		 * @returns {String} エスケープされた文字列
		 */
		escapeHtml: function(str) {
			return h5.u.str.escapeHtml(str);
		}
	};

	// =============================
	// Functions
	// =============================

	/**
	 * jQueryオブジェクトか判定し、jQueryオブジェクトならそのまま、そうでないならjQueryオブジェクトに変換して返します。
	 *
	 * @function
	 * @param {Object} obj DOM要素
	 * @returns {Object} jQueryObject
	 */
	function getJQueryObj(obj) {
		return h5.u.obj.isJQueryObject(obj) ? obj : $(obj);
	}

	/**
	 * ViewTemplateクラス
	 */
	function ViewTemplate() {
		this._templateMap = {};
	}
	$.extend(ViewTemplate.prototype, {
		/**
		 * 受け取ったviewにこのインスタンスが持つテンプレートを登録する
		 */
		applyToView: function(view) {
			var templateMap = this._templateMap;
			for ( var p in templateMap) {
				view.register(p, templateMap[p]);
			}
		},
		/**
		 * テンプレートマップに登録
		 */
		register: function(id, templateString) {
			this._templateMap[id] = templateString;
		},
		/**
		 * 別のviewTempalteとマージする
		 */
		marge: function(viewTemplate) {
			$.extend(this._templateMap, viewTemplate._templateMap);
		},
		/**
		 * エレメントからテンプレートマップに登録
		 *
		 * @param {DOM|jQuery} $templateElements テンプレートが記述されている要素(<script type="text/ejs">...</script>)
		 */
		registByElement: function compileTemplatesByElements($templateElements) {
			$templateElements = $($templateElements);
			if ($templateElements.length === 0) {
				return;
			}
			var that = this;
			$templateElements.each(function() {
				var templateId = $.trim(this.id);
				var templateString = $.trim(this.innerHTML);

				// 空文字または空白ならエラー
				if (!templateId) {
					// load()で更にdetail対してエラー情報を追加するため、ここで空のdetailオブジェクトを生成する
					throwFwError(ERR_CODE_TEMPLATE_INVALID_ID, null, {});
				}
				that.register(templateId, templateString);
			});
		}

	});
	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/**
	 * テンプレートを扱うクラス
	 * <p>
	 * <a href="h5.core.view.html">h5.core.view</a>がこのクラスを実装しています。また、<a
	 * href="h5.core.view.html#createView">h5.core.view.createView()</a>でこのクラスのインスタンスを生成できます。
	 * </p>
	 * <p>
	 * また、コントローラは内部にController.viewインスタンスを持ち、コントローラ内であればthis.viewで参照することができます。
	 * </p>
	 * <p>
	 * コントローラの持つViewについての詳細は、<a href="Controller.view.html">Controller.view</a>を参照してください。
	 * </p>
	 *
	 * @class
	 * @name View
	 */
	function View() {
		/**
		 * キャッシュしたテンプレートを保持するオブジェクト
		 *
		 * @private
		 * @name __cachedTemplates
		 * @memberOf View
		 */
		this.__cachedTemplates = {};
	}

	$.extend(View.prototype, {
		/**
		 * 指定されたパスのテンプレートファイルを非同期で読み込みキャッシュします。<br>
		 * このメソッドでは、通信エラー発生時に自動リトライは行いません（ver.1.1.4現在。将来この動作は変更される可能性があります）。
		 *
		 * @memberOf View
		 * @name load
		 * @function
		 * @param {String|Array[String]} resourcePaths テンプレートファイル(.ejs)のパス (配列で複数指定可能)
		 * @returns {Promise} promiseオブジェクト
		 */
		load: function(resourcePaths) {
			var dfd = getDeferred();
			var paths = null;

			// resourcePathsが文字列か配列でなかったらエラーを投げます。
			switch ($.type(resourcePaths)) {
			case 'string':
				if (!$.trim(resourcePaths)) {
					throwFwError(ERR_CODE_INVALID_FILE_PATH);
				}
				paths = [resourcePaths];
				break;
			case 'array':
				paths = resourcePaths;
				if (paths.length === 0) {
					throwFwError(ERR_CODE_INVALID_FILE_PATH);
				}
				for (var i = 0, len = paths.length; i < len; i++) {
					if (!isString(paths[i])) {
						throwFwError(ERR_CODE_INVALID_FILE_PATH);
					} else if (!$.trim(paths[i])) {
						throwFwError(ERR_CODE_INVALID_FILE_PATH);
					}
				}
				break;
			default:
				throwFwError(ERR_CODE_INVALID_FILE_PATH);
			}

			var promises = [];
			for (var i = 0, l = paths.length; i < l; i++) {
				promises.push(h5.res.get(paths[i]));
			}
			var view = this;
			waitForPromises(promises, function(resources) {
				// viewにテンプレートを登録
				resources = isArray(resources) ? resources : [resources];
				// 先に全てのテンプレートが登録できるかどうかをチェック
				// チェックしながら登録するテンプレートを列挙する
				var validTemplates = [];
				var invalidTemplate;
				for (var i = 0, l = resources.length; i < l; i++) {
					var templates = resources[i].templates;
					for (var j = 0, len = templates.length; j < len; j++) {
						if (!view.isValid(templates[j].content)) {
							invalidTemplate = templates[j];
							break;
						}
						validTemplates.push(templates[j]);
					}
					if (invalidTemplate) {
						break;
					}
				}
				if (invalidTemplate) {
					try {
						// invalidなテンプレートがあったらエラーオブジェクトを取得してreject
						view.register(invalidTemplate.id, invalidTemplate.content);
					} catch (e) {
						// 登録でエラーが発生したらrejectする
						// detailにエラーが発生した時のリソースのurlとpathを追加する
						e.detail.url = resources[i].url;
						e.detail.path = resources[i].path;
						return dfd.reject(e);
					}
				}

				// 全てvalidならすべてのテンプレートを登録
				for (var i = 0, l = validTemplates.length; i < l; i++) {
					view.register(validTemplates[i].id, validTemplates[i].content);
				}
				// TODO doneハンドラに渡す引数を作成
				dfd.resolve();
			}, function(e) {
				fwLogger.error(e.message);
				dfd.reject(e);
			});
			return dfd.promise();
		},

		/**
		 * Viewインスタンスに登録されている、利用可能なテンプレートのIDの配列を返します。
		 *
		 * @memberOf View
		 * @name getAvailableTemplates
		 * @function
		 * @returns {Array[String]} テンプレートIDの配列
		 */
		getAvailableTemplates: function() {
			var ids = [];
			for ( var id in this.__cachedTemplates) {
				ids.push(id);
			}
			return ids;
		},
		/**
		 * Viewインスタンスに、指定されたIDとテンプレート文字列からテンプレートを1件登録します。
		 * <p>
		 * 指定されたIDのテンプレートがすでに存在する場合は上書きします。 templateStringが不正な場合はエラーを投げます。
		 * </p>
		 *
		 * @memberOf View
		 * @name register
		 * @function
		 * @param {String} templateId テンプレートID
		 * @param {String} templateString テンプレート文字列
		 */
		register: function(templateId, templateString) {
			if ($.type(templateString) !== 'string') {
				throwFwError(ERR_CODE_TEMPLATE_COMPILE_NOT_STRING, null, {
					id: templateId
				});
			} else if (!isString(templateId) || !$.trim(templateId)) {
				throwFwError(ERR_CODE_TEMPLATE_INVALID_ID, []);
			}
			/* del begin */
			if (this.__cachedTemplates[templateId]) {
				fwLogger.info(FW_LOG_TEMPLATE_OVERWRITE, templateId);
			}
			/* del end */
			try {
				var compiledTemplate = new EJS.Compiler(templateString, DELIMITER);
				compiledTemplate.compile();
				this.__cachedTemplates[templateId] = compiledTemplate.process;
			} catch (e) {
				var lineNo = e.lineNumber;
				var msg = lineNo ? ' line:' + lineNo : '';
				throwFwError(ERR_CODE_TEMPLATE_COMPILE_SYNTAX_ERR, [msg, e.message], {
					id: templateId
				});
			}
		},

		/**
		 * テンプレート文字列が、コンパイルできるかどうかを返します。
		 *
		 * @memberOf View
		 * @name isValid
		 * @function
		 * @returns {Boolean} 第一引数に渡されたテンプレート文字列がコンパイル可能かどうか。
		 */
		isValid: function(templateString) {
			try {
				var compiledTemplate = new EJS.Compiler(templateString, DELIMITER);
				compiledTemplate.compile();
				return true;
			} catch (e) {
				return false;
			}
		},

		/**
		 * パラメータで置換された、指定されたテンプレートIDのテンプレートを取得します。
		 * <p>
		 * 取得するテンプレート内に置換要素([%= %])が存在する場合、パラメータを全て指定してください。
		 * </p>
		 * <p>
		 * templateIdがこのViewインスタンスで利用可能でなければエラーを投げます。
		 * </p>
		 * <p> ※ ただし、コントローラが持つviewインスタンスから呼ばれた場合、templateIdが利用可能でない場合は再帰的に親コントローラをたどり、
		 * 親コントローラが持つViewインスタンスで利用可能かどうか確認します。 利用可能であれば、そのインスタンスのview.get()を実行します。
		 * </p>
		 * <p>
		 * 一番上の親のViewインスタンスまで辿ってもtemplateId利用可能でなければ場合はh5.core.view.get()を実行します。
		 * h5.core.viewでtemplateIdが利用可能でなければエラーを投げます。
		 * </p>
		 * <p>
		 * <a href="#update">update()</a>, <a href="#append">append()</a>, <a
		 * href="#prepend">prepend()</a>についても同様です。
		 * </p>
		 *
		 * @memberOf View
		 * @name get
		 * @function
		 * @param {String} templateId テンプレートID
		 * @param {Object} [param] パラメータ(オブジェクトリテラルで指定)
		 * @returns {String} テンプレート文字列
		 */
		get: function(templateId, param) {
			var cache = this.__cachedTemplates;

			if (!isString(templateId) || !$.trim(templateId)) {
				throwFwError(ERR_CODE_TEMPLATE_INVALID_ID);
			}

			var template = cache[templateId];

			if (!template) {
				throwFwError(ERR_CODE_TEMPLATE_ID_UNAVAILABLE, templateId);
			}

			var p = (param) ? $.extend(true, {}, param) : {};
			var helper = p.hasOwnProperty('_h') ? new EJS.Helpers(p) : new EJS.Helpers(p, {
				_h: helperExtras
			});
			var ret = null;

			try {
				ret = template.call(p, p, helper);
			} catch (e) {
				throwFwError(ERR_CODE_TEMPLATE_PROPATY_UNDEFINED, e.toString(), e);
			}

			return ret;
		},

		/**
		 * 要素を指定されたIDのテンプレートで書き換えます。
		 * <p>
		 * templateIdがこのViewインスタンスで利用可能でなければエラーを投げますが、
		 * コントローラが持つviewインスタンスから呼ばれた場合は親コントローラのviewを再帰的にたどります。詳細は<a href="#get">get()</a>をご覧ください。
		 * </p>
		 *
		 * @memberOf View
		 * @name update
		 * @function
		 * @param {String|Element|jQuery} element DOM要素(セレクタ文字列, DOM要素, jQueryオブジェクト)
		 * @param {String} templateId テンプレートID
		 * @param {Object} [param] パラメータ
		 * @returns {jQuery} テンプレートが適用されたDOM要素(jQueryオブジェクト)
		 */
		update: function(element, templateId, param) {
			return getJQueryObj(element).html(this.get(templateId, param));
		},

		/**
		 * 要素の末尾に指定されたIDのテンプレートを挿入します。
		 * <p>
		 * templateIdがこのViewインスタンスで利用可能でなければエラーを投げますが、
		 * コントローラが持つviewインスタンスから呼ばれた場合は親コントローラのviewを再帰的にたどります。詳細は<a href="#get">get()</a>をご覧ください。
		 * </p>
		 *
		 * @memberOf View
		 * @name append
		 * @function
		 * @param {Element|jQuery} element DOM要素(セレクタ文字列, DOM要素, jQueryオブジェクト)
		 * @param {String} templateId テンプレートID
		 * @param {Object} [param] パラメータ
		 * @returns {jQuery} テンプレートが適用されたDOM要素(jQueryオブジェクト)
		 */
		append: function(element, templateId, param) {
			return getJQueryObj(element).append(this.get(templateId, param));
		},

		/**
		 * 要素の先頭に指定されたIDのテンプレートを挿入します。
		 * <p>
		 * templateIdがこのViewインスタンスで利用可能でなければエラーを投げますが、
		 * コントローラが持つviewインスタンスから呼ばれた場合は親コントローラのviewを再帰的にたどります。詳細は<a href="#get">get()</a>をご覧ください。
		 * </p>
		 *
		 * @memberOf View
		 * @name prepend
		 * @function
		 * @param {String|Element|jQuery} element DOM要素(セレクタ文字列, DOM要素, jQueryオブジェクト)
		 * @param {String} templateId テンプレートID
		 * @param {Object} [param] パラメータ
		 * @returns {jQuery} テンプレートが適用されたDOM要素(jQueryオブジェクト)
		 */
		prepend: function(element, templateId, param) {
			return getJQueryObj(element).prepend(this.get(templateId, param));
		},

		/**
		 * 指定されたテンプレートIDのテンプレートが存在するか判定します。
		 *
		 * @memberOf View
		 * @name isAvailable
		 * @function
		 * @param {String} templateId テンプレートID
		 * @returns {Boolean} 判定結果(存在する: true / 存在しない: false)
		 */
		isAvailable: function(templateId) {
			return !!this.__cachedTemplates[templateId];
		},

		/**
		 * 引数に指定されたテンプレートIDをもつテンプレートをキャッシュから削除します。 引数を指定しない場合はキャッシュされている全てのテンプレートを削除します。
		 *
		 * @memberOf View
		 * @name clear
		 * @param {String|String[]} templateIds テンプレートID
		 * @function
		 */
		clear: function(templateIds) {
			if (typeof templateIds === TYPE_OF_UNDEFINED) {
				this.__cachedTemplates = {};
				return;
			}

			var templateIdsArray = null;
			switch ($.type(templateIds)) {
			case 'string':
				templateIdsArray = [templateIds];
				break;
			case 'array':
				if (!templateIds.length) {
					throwFwError(ERR_CODE_TEMPLATE_INVALID_ID);
				}
				templateIdsArray = templateIds;
				break;
			default:
				throwFwError(ERR_CODE_TEMPLATE_INVALID_ID);
			}

			for (var i = 0, len = templateIdsArray.length; i < len; i++) {
				var id = templateIdsArray[i];
				if (!isString(id) || !$.trim(id)) {
					throwFwError(ERR_CODE_TEMPLATE_INVALID_ID);
				}
				/* del begin */
				if (!this.__cachedTemplates[id]) {
					fwLogger.warn(FW_LOG_TEMPLATE_NOT_REGISTERED, id);
				}
				/* del end */
			}

			for (var i = 0, len = templateIdsArray.length; i < len; i++) {
				delete this.__cachedTemplates[templateIdsArray[i]];
			}
		},

		/**
		 * データバインドを開始します。
		 * <p>
		 * 注意:<br>
		 * このメソッドではバインド対象にコメントビューを指定できません。<br>
		 * コメントビューを使用したデータバインドは、コントローラが持つViewインスタンス(<a href="Controller.html#view">Controller.view</a>)から実行して下さい。
		 *
		 * @since 1.1.0
		 * @param {String|Element|Element[]|jQuery} element コメントビュー疑似セレクタ、またはDOM要素(セレクタ文字列, DOM要素,
		 *            DOM要素の配列, jQueryオブジェクト)。 DOM要素の配列を指定する場合、全ての要素ノードの親ノードが同じでなければいけません。
		 * @param {Object} context データコンテキストオブジェクト
		 * @memberOf View
		 * @name bind
		 * @function
		 * @returns {Binding}
		 */
		bind: function(element, context) {
			var targetNodes = null;

			if (element == null) {
				throwFwError(ERR_CODE_BIND_INVALID_TARGET);
			}

			// targetのチェック
			if (isArray(element)) {
				//配列はDOMノードの配列であることを仮定
				targetNodes = element;
			} else {
				//targetがDOM、セレクタ文字列の場合をまとめて扱う
				//インラインテンプレートが指定された場合はコントローラ側のview.bindが予めノード化しているので
				//ここに到達した時にはノードになっている
				var $element = $(element);

				if ($element.length === 0) {
					// 要素がない、もしくは見つからない場合はエラー
					throwFwError(ERR_CODE_BIND_INVALID_TARGET);
				}

				//bind()はルートノードが複数であることをサポートするので、lengthは1には限定しない
				//ただし、これはappend, prepend等の動作を考慮したものである。
				//つまり、全ての要素は同じノードを親として持っていることを前提としている。
				//厳密にはチェックすべきだが、実際に問題になることはほとんどないだろうと考え行っていない。
				targetNodes = $element.toArray();
			}

			// contextのチェック
			if (context == null || typeof context !== 'object' || isArray(context)
					|| h5.core.data.isObservableArray(context)) {
				throwFwError(ERR_CODE_BIND_CONTEXT_INVALID);
			}

			return h5internal.view.createBinding(targetNodes, context);
		}
	});

	var view = new View();

	/**
	 * <a href="./View.html">View</a>クラスのインスタンスを生成します。
	 * <p>
	 * この関数はh5.core.viewに公開されたViewインスタンスのみが持ちます。この関数で作られたViewインスタンスはcreateView()を持ちません。
	 * </p>
	 *
	 * @name createView
	 * @memberOf h5.core.view
	 * @function
	 */
	view.createView = function() {
		return new View();
	};

	/**
	 * HTMLに記述されたテンプレートを読み込む
	 * <p>
	 * HTMLにあるテンプレートが構文エラーの場合は、例外をそのままスローする。
	 */
	$(function() {
		$('script[type="text/ejs"]').each(function() {
			var templateId = $.trim(this.id);
			var templateText = $.trim(this.innerHTML);

			if (templateText.length === 0 || !templateId) {
				return;
			}

			var compiledTemplate = new EJS.Compiler(templateText, DELIMITER);
			compiledTemplate.compile();
			view.__cachedTemplates[templateId] = compiledTemplate.process;
		});
	});

	// =============================
	// Expose to window
	// =============================

	/**
	 * <p>
	 * グローバルに公開されているViewクラスのインスタンスです。
	 * </p>
	 * <p>
	 * h5.core.viewは、<a href="View.html">View</a>クラスであり、<a href="View.html">View</a>クラスのメソッドを持ちます。<br>
	 * ただし、h5.core.viewはViewクラスを生成するためのcreateViewメソッドを持ち、生成されたViewクラスはcreateViewメソッドを持ちません。
	 * </p>
	 *
	 * @name view
	 * @memberOf h5.core
	 * @see View
	 * @namespace
	 */
	h5.u.obj.expose('h5.core', {
		view: view
	});
})();
/* h5.core.view_binding */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	var DATA_H5_BIND = 'data-h5-bind';

	var DATA_H5_CONTEXT = 'data-h5-context';

	var DATA_H5_LOOP_CONTEXT = 'data-h5-loop-context';

	var DATA_H5_DYN_CTX = 'data-h5-dyn-ctx';

	var DATA_H5_DYN_VID = 'data-h5-dyn-vid';

	var DATA_H5_DYN_BIND_ROOT = 'data-h5-dyn-bind-root';

	/** 初期状態のclassNameを保存しておく属性 */
	var DATA_H5_DYN_CN = 'data-h5-dyn-cn';

	/** 1つのバインド指定のターゲットとソースのセパレータ（「text:prop」の「:」） */
	var BIND_DESC_TARGET_SEPARATOR = ':';

	/** 複数のバインド指定のセパレータ（「text:prop1; attr(href):prop2」の「;」） */
	var BIND_DESC_SEPARATOR = ';';

	/** バインドターゲットのカッコ内を取得するための正規表現（「attr(href)」の「href」を取得） */
	var BIND_TARGET_DETAIL_REGEXP = /\(\s*(\S+)\s*\)/;

	// エラーコード
	/** data-h5-bindでattr, styleバインドを行う場合は、「style(color)」のように具体的なバインド先を指定する必要があります。 */
	var ERR_CODE_REQUIRE_DETAIL = 7100;

	/** 不明なバインド先が指定されました。html,style等決められたバインド先を指定してください。 */
	var ERR_CODE_UNKNOWN_BIND_DIRECTION = 7101;

	/** コンテキスト値が不正です。data-h5-contextの場合はオブジェクト、data-h5-loop-contextの場合は配列を指定してください。 */
	var ERR_CODE_INVALID_CONTEXT_SRC = 7102;


	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.core.view_binding');

	/* del begin */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_REQUIRE_DETAIL] = 'data-h5-bindでattr, styleバインドを行う場合は、「style(color)」のように具体的なバインド先を指定する必要があります。';
	errMsgMap[ERR_CODE_UNKNOWN_BIND_DIRECTION] = '不明なバインド先が指定されました。html,style等決められたバインド先を指定してください。';
	errMsgMap[ERR_CODE_INVALID_CONTEXT_SRC] = 'コンテキスト値が不正です。data-h5-contextの場合はオブジェクト、data-h5-loop-contextの場合は配列を指定してください。';
	addFwErrorCodeMap(errMsgMap);
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	var contextUid = 0;

	/** viewUidカウンタ */
	var viewUid = 0;

	/** bindUidカウンタ */
	var bindRootId = 0;

	/** グローバルなbindRootIdからBindingインスタンスへのマップ */
	var bindRootIdToBindingMap = {};

	//MEMO バインド関係のマップのたどり方
	//(1)ソース -> 特定のビュー： srcToViewMap[srcIndex][viewUid] がビュー。
	//  srcIndexはbinding._usingContexts配列のソースオブジェクトのインデックス位置。
	//  srcToViewMap[i][j]の中身はノードの配列。
	//(2)特定のビュー -> ソース： viewUid経由でたどれる。viewToSrcMap[viewUid] がソースオブジェクト。
	//  ビュー -> ソースはbindingインスタンス単位ではなく、グローバルに管理（ビュー自体が実質シングルトンなので）。
	//(3)loop-contextの各要素と対応する（要素ごとの）ビュー：
	//  binding._loopElementsMap[viewUid] = loopElementsArray;
	//  loopElementsArrayのi番目にはビューのノードの配列が入っていて、ソース配列のi番目と対応。


	/**
	 * ビュー（viewUid） -> ソースオブジェクト のマップ。many:1。キーはviewUid、値はソースオブジェクト。
	 */
	var viewToSrcMap = {};

	// =============================
	// Functions
	// =============================

	var cloneNodeDeeply;
	(function() {
		var cloneTest = document.createElement('div');
		cloneTest.h5Dummy = 'a';
		var cloned = cloneTest.cloneNode(false);
		var useOuterHtmlClone = (cloned.h5Dummy !== undefined);
		cloneTest.h5Dummy = undefined;

		if (useOuterHtmlClone) {
			cloned.h5Dummy = undefined;

			//IE7の場合、cloneNodeでノードを複製すると、$().find()でクローンした要素を取得できなくなる場合があった（詳細な原因は不明）。
			//また、IE8以下、またはIE9でもDocModeが8以下の場合、ノードに付加したJSプロパティやattachEventのイベントがクローン先にもコピーされてしまう。
			//そのため、cloneNode()した結果JSプロパティがコピーされる環境（== DocMode<=8の環境、を想定）では
			//エレメントのコピーはouterHTMLを基にjQueryによるノード"生成"で行う（!= クローン）ようにしている。
			//ノードの生成は、srcNodeのownerDocumentから生成し、documentが異なっても対応できるようにしている
			cloneNodeDeeply = function(srcNode) {
				var doc = srcNode.ownerDocument;
				if (srcNode.nodeType === NODE_TYPE_ELEMENT) {
					//IE8以下で<li>等のouterHTMLを取得するとタグの前に改行が入る場合がある
					//（<li>タグの前の空白文字が改行になる模様)
					// scriptタグはクローンしない(parseHTMLの第3引数指定無し(false)でscriptはコピーしない)
					return $($.trim(srcNode.outerHTML), doc)[0];
				}
				return srcNode.cloneNode(true);
			};
		} else {
			//その他のブラウザでは、cloneNodeを使ってノードをクローンする。cloneNodeの方が、通常パフォーマンスは良いため。
			cloneNodeDeeply = function(srcNode) {
				return srcNode.cloneNode(true);
			};
		}
	})();


	function getElemAttribute(node, attr) {
		if (!node || node.nodeType !== NODE_TYPE_ELEMENT) {
			return undefined;
		}
		return node.getAttribute(attr);
	}

	function setElemAttribute(node, attr, value) {
		node.setAttribute(attr, value);
	}

	function removeElemAttribute(node, attr) {
		node.removeAttribute(attr);
	}

	function toArray(pseudoArray) {
		if (!pseudoArray) {
			return null;
		}

		var ret = [];
		for (var i = 0, len = pseudoArray.length; i < len; i++) {
			ret.push(pseudoArray[i]);
		}
		return ret;
	}

	function getSrcFromView(viewUid) {
		return viewToSrcMap[viewUid];
	}

	/**
	 * viewUidを返す。返される値は、1回のFWの生存期間中一意。（リロードされるとリセット）
	 */
	function getViewUid() {
		return viewUid++;
	}


	function queryQualifiedElements(rootNode, attrs, value, includeRoot) {
		var ret = [];

		var attrArray = wrapInArray(attrs);

		if (includeRoot === true) {
			//ルートノードを含める場合は、自分をルートとして再帰
			queryQualifiedElementsInner(ret, rootNode, attrArray, value);
			return ret;
		}

		//ルートノードを含めない場合は、子要素をそれぞれルートにして処理
		var childNodes = rootNode.childNodes;
		for (var i = 0, len = childNodes.length; i < len; i++) {
			queryQualifiedElementsInner(ret, childNodes[i], attrArray, value);
		}
		return ret;
	}

	function queryQualifiedElementsInner(ret, rootNode, attrs, value) {
		if (rootNode.nodeType !== NODE_TYPE_ELEMENT) {
			return;
		}

		for (var i = 0, len = attrs.length; i < len; i++) {
			var attrValue = rootNode.getAttribute(attrs[i]);
			if (typeof value === TYPE_OF_UNDEFINED) {
				if (attrValue !== null) {
					ret.push(rootNode);
					break;
				}
			} else {
				//IE7以下では、setAttribute()でdata-*属性に数値を入れると、getAttr()したとき型がNumberになっている。
				//しかし、outerHTMLでノードをクローンした場合、data-*属性の値は文字列型になっている。
				//そのため、ここでは厳密等価ではなく通常の等価比較を行っている。
				if (attrValue !== null && attrValue == value) {
					ret.push(rootNode);
					break;
				}
			}
		}

		if (rootNode.childNodes.length > 0) {
			var childNodes = rootNode.childNodes;
			for (var i = 0, len = childNodes.length; i < len; i++) {
				queryQualifiedElementsInner(ret, childNodes[i], attrs, value);
			}
		}
	}

	/**
	 * 別のコンテキストに属していない（＝現在のコンテキストに属している）バインド対象要素を返します。ネストしたコンテキストの中の対象要素は含まれません。
	 *
	 * @param {Node|Node[]} rootNodes ルート要素、またはルート要素の配列
	 * @returns {jQuery} 別のコンテキストに属していないバインド対象要素
	 */
	function $getBindElementsInContext(rootNodes, isMultiRoot) {
		rootNodes = wrapInArray(rootNodes);

		var bindElements = [];

		for (var i = 0, len = rootNodes.length; i < len; i++) {
			var rootNode = rootNodes[i];

			//ルート要素がエレメントでない場合は何もしない
			if (rootNode.nodeType !== NODE_TYPE_ELEMENT) {
				continue;
			}

			//バインディングルートの場合は、
			//rootNodeは「仮想の親要素（バインドルート）」の子要素として考える必要がある。
			//ルート要素で別のコンテキストが指定されている場合はそれ以下のノードは絶対に含まれない
			if ((isMultiRoot === true)
					&& (getElemAttribute(rootNode, DATA_H5_CONTEXT) != null || getElemAttribute(
							rootNode, DATA_H5_LOOP_CONTEXT) != null)) {
				continue;
			}

			var candidateBindElems = queryQualifiedElements(rootNode, DATA_H5_BIND, undefined, true);
			for (var j = 0, cndBindElemsLen = candidateBindElems.length; j < cndBindElemsLen; j++) {
				var isInCurrentContext = true;

				for (var node = candidateBindElems[j]; node != null; node = node.parentNode) {
					if (node === rootNode) {
						break;
					}

					if (getElemAttribute(node, DATA_H5_CONTEXT) != null
							|| getElemAttribute(node, DATA_H5_LOOP_CONTEXT) != null) {
						isInCurrentContext = false;
						break;
					}
				}

				if (isInCurrentContext) {
					bindElements.push(candidateBindElems[j]);
				}
			}
		}

		return $(bindElements);
	}

	/**
	 * 自分のコンテキストの直接の子供であるdata-context（またはdata-loop-context）を返します。
	 */
	function $getChildContexts(rootNodes, dataContextAttr, isMultiRoot) {
		var childContexts = [];

		for (var i = 0, len = rootNodes.length; i < len; i++) {
			var rootNode = rootNodes[i];

			//ルート要素がエレメントでない場合は別のコンテキストである可能性はない
			if (rootNode.nodeType !== NODE_TYPE_ELEMENT) {
				continue;
			}

			if (isMultiRoot === true) {
				//このrootNodesがバインディングのルートノードの場合（＝仮想的なルートノードの子要素の場合）

				//指定されたコンテキストが設定されていれば必ず直接の子供
				if (rootNode.getAttribute(dataContextAttr) != null) {
					childContexts.push(rootNode);
					continue;
				}

				//コンテキストが設定されていれば、その子孫のノードは必ず別のコンテキストに属していることになる
				if (getElemAttribute(rootNode, DATA_H5_CONTEXT) != null
						|| getElemAttribute(rootNode, DATA_H5_LOOP_CONTEXT) != null) {
					continue;
				}
			}

			var candidateContextElems = queryQualifiedElements(rootNode, dataContextAttr,
					undefined, false);
			for (var j = 0, cndCtxElemsLen = candidateContextElems.length; j < cndCtxElemsLen; j++) {
				// jQuery1.10.1で、ポップアップウィンドウ先の要素をセレクタで取得すると、jQuery内部(setDocument箇所)でエラーになる
				// jQuery1.10.1でのエラー回避のためjQueryを使わないで親ノードを取得している
				var contextElem = $(candidateContextElems[j])[0];
				var contextParent = contextElem.parentNode;
				if ((getElemAttribute(contextParent, DATA_H5_CONTEXT) == null && getElemAttribute(
						contextParent, DATA_H5_LOOP_CONTEXT) == null)
						|| contextParent === rootNode) {
					childContexts.push(contextElem);
				}
			}
		}

		return $(childContexts);
	}


	function isObservableItem(obj) {
		//TODO 厳密に判定
		// ObservableItemの場合もtrueを返す
		if (obj && obj.addEventListener && obj.getModel && !isArray(obj)
				&& !h5.core.data.isObservableArray(obj) || h5.core.data.isObservableItem(obj)) {
			return true;
		}
		return false;
	}

	function addViewUid(rootNodes, viewUid) {
		for (var i = 0, len = rootNodes.length; i < len; i++) {
			var n = rootNodes[i];
			if (n.nodeType === NODE_TYPE_ELEMENT) {
				setElemAttribute(n, DATA_H5_DYN_VID, viewUid);
			}
		}
	}

	/**
	 * data-loop-contextによるループバインドを行う。（applyBindingの中からのみ呼ばれる）
	 *
	 * @param {Binding} binding バインディングインスタンス
	 * @param {Node|Node[]} rootNodes
	 *            データコンテキストを持つルートノード、またはルートノードの配列（テキストノードやコメントノードなどELEMENT以外が含まれる場合も有る）
	 * @param {Object} context データコンテキスト
	 */
	function applyLoopBinding(binding, rootNodes, context) {
		var viewUid = getViewUid();

		//loop-contextの場合は、ループのルートノードは必ず単一のノード
		var loopRootElement = rootNodes[0];

		//ループ前に一旦内部要素をすべて外す
		$(loopRootElement).empty();

		if (!context) {
			//contextがない場合はループを一切行わない（BindingEntryもつけない）
			return;
		}

		if (!(isArray(context) || h5.core.data.isObservableArray(context))) {
			//data-h5-loop-contextの場合contextは配列でなければならない
			throwFwError(ERR_CODE_INVALID_CONTEXT_SRC);
		}

		addViewUid(rootNodes, viewUid);

		binding._addBindingEntry(context, loopRootElement, viewUid);

		if (h5.core.data.isObservableArray(context) && !binding._isWatching(context)) {
			var changeListener = function(event) {
				binding._observableArray_changeListener(event);
			};
			binding._listeners[binding._getContextIndex(context)] = changeListener;

			context.addEventListener('change', changeListener);
		}

		//ループルートノードに対応する子ノードリストを、保存しているビューソースから取り出す
		var loopDynCtxId = getElemAttribute(loopRootElement, DATA_H5_DYN_CTX);
		var srcRootChildNodes = toArray(binding._getSrcCtxNode(loopDynCtxId).childNodes);

		//このループコンテキストの各要素に対応するノード（配列）を格納する配列
		var loopElementsArray = [];
		binding._loopElementsMap[viewUid] = loopElementsArray;

		//appendChildの呼び出し回数削減。
		//ループ単位ごとにappendChildしてdocumentにバインドする（＝Fragmentは都度空になる）ので、使いまわしている。
		//対象要素のdocumentオブジェクトを使用する
		var fragment = loopRootElement.ownerDocument.createDocumentFragment();

		var getContextElement = context.get ? function(idx) {
			return context.get(idx);
		} : function(idx) {
			return context[idx];
		};

		for (var i = 0, len = context.length; i < len; i++) {
			var loopNodes = [];

			//1要素分のノードのクローンを作成
			for (var j = 0, childLen = srcRootChildNodes.length; j < childLen; j++) {
				var clonedInnerNode = cloneNodeDeeply(srcRootChildNodes[j]); //deep copy

				loopNodes.push(clonedInnerNode);

				fragment.appendChild(clonedInnerNode);
			}

			//配列1要素分のノードリストを保存
			loopElementsArray[i] = loopNodes;

			//IE6で、documentツリーにぶら下がっていない状態で属性操作を行うとそれが反映されない場合がある
			//（例えばinput-checkboxのcheckedを操作してもそれが反映されない）
			//そのため、先にツリーにappendしてからバインディングを行う
			loopRootElement.appendChild(fragment);

			//配列1要素分のバインディングを実行
			applyBinding(binding, loopNodes, getContextElement(i), false, true);
		}
	}

	/**
	 * データバインドを行う。context単位にsrc/viewの対応を保存。可能ならイベントハンドラを設定して、変更伝搬させる
	 *
	 * @param {Binding} binding バインディングインスタンス
	 * @param {Node|Node[]} rootNodes
	 *            データコンテキストを持つルートノード、またはルートノードの配列（テキストノードやコメントノードなどELEMENT以外が含まれる場合も有る）
	 * @param {Object} context データコンテキスト
	 * @param {Boolean} isLoopContext ループコンテキストかどうか
	 */
	function applyBinding(binding, rootNodes, context, isLoopContext, isMultiRoot) {
		//配列化（要素が直接来た場合のため）
		rootNodes = wrapInArray(rootNodes);

		if (isLoopContext) {
			//loop-contextの場合はループ用の処理を行う
			//loop-contextの場合、ルートノードは必ず単一の要素
			applyLoopBinding(binding, rootNodes, context);
			return;
		}

		//以下はloop-contextでない場合

		var viewUid = getViewUid();

		if (context) {
			//TODO loop-contextにおいて個々のループ単位のコンテキスト自身をcontextやloop-contextにバインドする方法を追加した場合
			//ここのチェックルーチンは変更になる
			if (typeof context !== 'object' || isArray(context)
					|| h5.core.data.isObservableArray(context)) {
				//data-h5-contextの場合contextはオブジェクトでなければならない（配列は不可）
				throwFwError(ERR_CODE_INVALID_CONTEXT_SRC);
			}

			//コンテキストが存在する場合
			//エレメントについては、ビュー->ソースをすぐにひけるようdata属性でviewUidを付加しておく
			addViewUid(rootNodes, viewUid);

			binding._addBindingEntry(context, rootNodes, viewUid);
		}
		//context===nullの場合に子要素のバインディングを解除する必要はない。
		//現状の実装では、初回はバインディングはまだ行われておらず、
		//2回目以降Itemのpropが変わった場合などで再バインドされるときは
		//バインドされていないオリジナルに対してバインドが再実行されるので、
		//「バインド済みのものに対して別のコンテキストを割り当てる」ことはない。

		var isItem = isObservableItem(context);

		if (isItem && !binding._isWatching(context)) {
			//まだこのバインディングが監視していないオブジェクトの場合は監視を始める。
			//ソースデータコンテキストから対応するすべてのビューを知ることができるので、
			//ハンドラは1アイテムにつき1つバインドすれば十分。
			var changeListener = function(event) {
				binding._observableItem_changeListener(event);
			};
			binding._listeners[binding._getContextIndex(context)] = changeListener;

			context.addEventListener('change', changeListener);
		}

		//自分のコンテキストに属しているバインディング対象要素を探す
		//（rootElement自体がバインド対象になっている場合もある）
		var $bindElements = $getBindElementsInContext(rootNodes, isMultiRoot);

		//自コンテキストに属する各要素のデータバインドを実行
		$bindElements.each(function() {
			doBind(this, context, isItem);
		});

		//ネストした子data-context, data-loop-contextのデータバインドを実行
		applyChildBinding(binding, rootNodes, context, false, isMultiRoot);
		applyChildBinding(binding, rootNodes, context, true, isMultiRoot);
	}

	function applyChildBinding(binding, rootNodes, context, isLoopContext, isMultiRoot) {
		var dataContextAttr = isLoopContext ? 'data-h5-loop-context' : 'data-h5-context';

		//自分のコンテキストに属するdata-contextを探す
		var $childContexts = $getChildContexts(rootNodes, dataContextAttr, isMultiRoot);

		//内部コンテキストについてapplyBindingを再帰的に行う
		$childContexts.each(function() {
			var childContextProp = getElemAttribute(this, dataContextAttr);
			//contextがisObservableItemならgetでchildContextを取得する
			//TODO getContextValue()などで統一するか
			var childContext = null;
			if (context) {
				childContext = isObservableItem(context) ? context.get(childContextProp)
						: context[childContextProp];
			}

			applyBinding(binding, this, childContext, isLoopContext);
		});
	}

	/**
	 * データバインドの指定（data-bind属性の値）をパースします。
	 *
	 * @param {String} bindDesc バインド指定（data-bind属性の値）
	 * @returns {Object} パース済みのバインド指定
	 */
	function parseBindDesc(bindDesc) {
		var splitDescs = bindDesc.split(BIND_DESC_SEPARATOR);
		var target = [];
		var targetDetail = [];
		var prop = [];

		for (var i = 0, len = splitDescs.length; i < len; i++) {
			var desc = splitDescs[i];
			if (desc.indexOf(BIND_DESC_TARGET_SEPARATOR) === -1) {
				var trimmed = $.trim(desc);
				if (trimmed.length > 0) {
					//ターゲット指定がない＝自動バインドの場合
					target.push(null);
					targetDetail.push(null);
					prop.push($.trim(desc));
				}
			} else {
				var sd = desc.split(BIND_DESC_TARGET_SEPARATOR);
				var trimmedTarget = $.trim(sd[0]);
				var trimmedProp = $.trim(sd[1]);

				var trimmedDetail = null;
				var detail = BIND_TARGET_DETAIL_REGEXP.exec(trimmedTarget);
				if (detail) {
					//attr(color) -> attr, colorに分離してそれぞれ格納
					trimmedDetail = detail[1];
					trimmedTarget = /(\S+)[\s\(]/.exec(trimmedTarget)[1];
				}

				if (trimmedTarget.length > 0 && trimmedProp.length > 0) {
					target.push(trimmedTarget);
					targetDetail.push(trimmedDetail);
					prop.push(trimmedProp);
				}
			}

		}

		var ret = {
			t: target,
			d: targetDetail,
			p: prop
		};
		return ret;
	}


	/**
	 * 指定されたエレメントに対して、data-bindで指示された方法で値をセットします。
	 */
	function doBind(element, context, isItem) {
		var bindDesc = parseBindDesc(getElemAttribute(element, DATA_H5_BIND));
		var targets = bindDesc.t;
		var details = bindDesc.d;
		var props = bindDesc.p;

		var elementLowerName = element.tagName.toLowerCase();
		var $element = $(element);

		//targetsとpropsのlengthは必ず同じ
		for (var i = 0, len = targets.length; i < len; i++) {
			var target = targets[i];
			var detail = details[i];
			var prop = props[i];

			var value = null;
			if (context) {
				//contextが存在する場合は値を取得。（contextがnullの場合は初期化を行う）
				if (isItem) {
					value = context.get(prop);
				} else {
					value = context[prop];
				}
			}

			if (target == null) {
				//自動指定は、inputタグならvalue属性、それ以外ならテキストノードをターゲットとする
				if (elementLowerName === 'input') {
					target = 'attr';
					detail = 'value';
				} else {
					target = 'text';
				}
			}

			switch (target) {
			case 'text':
				value == null ? $element.text('') : $element.text(value);
				break;
			case 'html':
				value == null ? $element.html('') : $element.html(value);
				break;
			case 'class':
				var origClassName = getElemAttribute(element, DATA_H5_DYN_CN);
				var isOrigClassEmpty = origClassName == null;
				var space = isOrigClassEmpty ? '' : ' ';

				var allowPutValue = false;
				if (value) {
					//バインドするクラス名がすでに初期状態のclassに書かれている場合は二重にセットしないようにする
					var classTester = new RegExp('\\s' + value + '\\s');
					//クラスが１つしか書いていない場合もあるので、正規表現でチェックしやすいよう前後にスペースを付けてチェック
					allowPutValue = !classTester.test(' ' + origClassName + ' ');
				}

				//初期状態のclassもバインドの値も空の場合は
				//jQueryのremoveClass()に倣って空文字を代入してclassをクリアする
				$element[0].className = (isOrigClassEmpty ? '' : origClassName)
						+ (allowPutValue ? space + value : '');
				break;
			case 'attr':
				if (!detail) {
					throwFwError(ERR_CODE_REQUIRE_DETAIL);
				}
				// inputのvalue属性の操作はval()メソッドを使う。valueがnullならval('')で空にする。
				// attrを使うと表示に反映されないため
				if (elementLowerName === 'input' && detail === 'value') {
					value == null ? $element.val('') : $element.val(value);
				} else {
					//ここのremoveAttr(), attr()はユーザーによる属性操作なので、jQueryのattr APIを使う
					value == null ? $element.removeAttr(detail) : $element.attr(detail, value);
				}
				break;
			case 'style':
				if (!detail) {
					throwFwError(ERR_CODE_REQUIRE_DETAIL);
				}
				//contextがnullの場合valueはnull。styleはcontext===nullの場合当該スタイルを削除するので
				//このコードでスタイルが削除される（よってcontextによる分岐は不要）。
				value == null ? $element.css(detail, '') : $element.css(detail, value);
				break;
			default:
				throwFwError(ERR_CODE_UNKNOWN_BIND_DIRECTION);
			}
		}
	}

	/**
	 * 指定されたノードをDOMツリーから削除し、同時にアンバインドします。
	 */
	function removeDomNodes(binding, parent, nodesToRemove) {
		for (var i = 0, len = nodesToRemove.length; i < len; i++) {
			var n = nodesToRemove[i];
			parent.removeChild(n);
			binding._removeBinding(n);
		}
	}

	function cloneChildNodes(parentNode) {
		var childNodes = parentNode.childNodes;
		var ret = [];

		for (var i = 0, len = childNodes.length; i < len; i++) {
			ret.push(cloneNodeDeeply(childNodes[i]));
		}

		return ret;
	}

	function addLoopChildren(binding, loopElements, srcCtxRootNode, method, methodArgs) {
		//追加される全てのノードを持つフラグメント。
		//Element.insertBeforeでフラグメントを挿入対象にすると、フラグメントに入っているノードの順序を保って
		//指定した要素の前に挿入できる。従って、unshift()の際insertBeforeを一度呼ぶだけで済む。
		var fragment = srcCtxRootNode.ownerDocument.createDocumentFragment();

		var newLoopNodes = [];
		for (var i = 0, argsLen = methodArgs.length; i < argsLen; i++) {
			var newChildNodes = cloneChildNodes(srcCtxRootNode);
			newLoopNodes[i] = newChildNodes;

			for (var j = 0, newChildNodesLen = newChildNodes.length; j < newChildNodesLen; j++) {
				fragment.appendChild(newChildNodes[j]);
			}

			applyBinding(binding, newChildNodes, methodArgs[i]);
		}
		Array.prototype[method].apply(loopElements, newLoopNodes);

		return fragment;
	}

	/**
	 * 配列のビューをリバースします。loopNodesはリバース前の配列であることを前提とします。<br>
	 */
	function reverseLoopNodes(parent, loopNodes) {
		//一旦すべてのノードをparentから外す
		while (parent.firstChild) {
			parent.removeChild(parent.firstChild);
		}

		//配列要素をリバースしたのと同等になるようにノードを再挿入する
		for (var i = 0, len = loopNodes.length; i < len; i++) {
			var nodesPerIndex = loopNodes[i];
			for (var j = nodesPerIndex.length - 1; j >= 0; j--) {
				parent.insertBefore(nodesPerIndex[j], parent.firstChild);
			}
		}
	}

	function spliceLoopNodes(binding, parent, srcArray, methodArgs, loopNodes, srcCtxRootNode) {
		var methodArgsLen = methodArgs.length;

		if (methodArgsLen === 0) {
			return;
		}

		var startPos = methodArgs[0];

		var removePos = startPos;

		var removeEnd;
		if (methodArgsLen === 1) {
			//spliceの第2引数省略時は、start以降すべての要素を削除
			removeEnd = srcArray.length;
		} else {
			//spliceの第2引数は削除する個数
			removeEnd = removePos + methodArgs[1];
		}

		//指定されたインデックスに対応するDOMノードを削除
		for (; removePos < removeEnd; removePos++) {
			var nodesPerIndex = loopNodes[removePos];
			//配列がスパースである場合やsplice()で実際の要素数以上の個数を削除しようとしている場合、
			//ループノードがない場合が考えられるのでチェックする
			if (nodesPerIndex) {
				removeDomNodes(binding, parent, nodesPerIndex);
			}
		}

		//まず、削除のみを行う
		loopNodes.splice(startPos, methodArgs[1]);

		if (methodArgsLen <= 2) {
			//追加する要素がなければ削除だけ行って終了
			return;
		}

		var insertionMarkerNode;

		var loopNodesLen = loopNodes.length;
		if (loopNodesLen === 0 || startPos === 0) {
			//全ての要素が削除された場合、またはstartが0の場合は先頭に追加する
			//全要素が削除されている場合firstChildはnullになっているはず
			insertionMarkerNode = parent.firstChild;
		} else if (startPos >= loopNodesLen) {
			//startPosがloopNodesの長さより大きい場合はノードは末尾に挿入
			//insertBefore()は、挿入位置がnullの場合は末尾挿入
			insertionMarkerNode = null;
		} else {
			//要素が残っている場合は、startの前に追加する
			insertionMarkerNode = loopNodes[startPos][0];
		}

		//以下は要素の挿入がある場合
		//spliceの挙動(on Chrome22)：
		//・startがlengthを超えている場合：要素の削除は起こらない、要素は末尾に挿入される、lengthは挿入した分だけ（startで指定したインデックスに入るわけではない）
		//・countが省略された場合：start以降の全要素を削除
		//・countがlengthを超えている場合：start以降の全要素が削除される
		//・挿入要素がある場合：startの位置にinsertBefore（startがlengthを超えている場合は末尾に挿入）
		var fragment = srcCtxRootNode.ownerDocument.createDocumentFragment();

		//loopNodesに対するspliceのパラメータ。要素の挿入を行うため、あらかじめstartPosと削除数0を入れておく
		var spliceArgs = [startPos, 0];

		//新たに挿入される要素に対応するノードを生成
		for (var i = 2, len = methodArgsLen; i < len; i++) {
			var newChildNodes = cloneChildNodes(srcCtxRootNode);

			for (var j = 0, newChildNodesLen = newChildNodes.length; j < newChildNodesLen; j++) {
				fragment.appendChild(newChildNodes[j]);
			}

			applyBinding(binding, newChildNodes, methodArgs[i]);
			spliceArgs.push(newChildNodes);
		}

		//DOMツリーの該当位置にノードを追加
		parent.insertBefore(fragment, insertionMarkerNode);

		//指定された位置に要素を挿入する
		Array.prototype.splice.apply(loopNodes, spliceArgs);
	}

	/**
	 * 指定されたループコンテキスト以下のDOMツリーを再構築します。既存のDOMノードは削除されます。
	 * このメソッドはObservableArrayの更新時のみ呼び出されることを想定しています。
	 */
	function refreshLoopContext(binding, srcArray, loopRootNode, loopNodes, srcCtxNode) {
		//現在のビューのすべての要素を外す
		for (var i = 0, len = loopNodes.length; i < len; i++) {
			removeDomNodes(binding, loopRootNode, loopNodes[i]);
		}

		//TODO addLoopChildrenとコード共通化

		//追加される全てのノードを持つフラグメント。
		//Element.insertBeforeでフラグメントを挿入対象にすると、フラグメントに入っているノードの順序を保って
		//指定した要素の前に挿入できる。従って、unshift()の際insertBeforeを一度呼ぶだけで済む。
		var fragment = loopRootNode.ownerDocument.createDocumentFragment();

		var newLoopNodes = [];
		for (var i = 0, srcLen = srcArray.length; i < srcLen; i++) {
			var newChildNodes = cloneChildNodes(srcCtxNode);
			newLoopNodes[i] = newChildNodes;

			for (var j = 0, newChildNodesLen = newChildNodes.length; j < newChildNodesLen; j++) {
				fragment.appendChild(newChildNodes[j]);
			}

			applyBinding(binding, newChildNodes, srcArray.get(i));
		}

		loopRootNode.appendChild(fragment);

		return newLoopNodes;
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	function Binding__observableArray_changeListener(event) {
		var views = this._getViewsFromSrc(event.target);
		if (!views) {
			return;
		}

		//(3)loop-contextの各要素と対応する（要素ごとの）ビュー：
		//binding._loopElementsMap[viewUid] = loopElementsArray;
		//loopElementsArrayのi番目にはビューのノードの配列が入っていて、ソース配列のi番目と対応。


		for ( var viewUid in views) {
			if (!views.hasOwnProperty(viewUid)) {
				continue;
			}

			var loopRootNode = views[viewUid];

			var srcCtxNode = this._getSrcCtxNode(getElemAttribute(loopRootNode, DATA_H5_DYN_CTX));

			var loopNodes = this._loopElementsMap[viewUid];

			switch (event.method) {
			case 'set':
				spliceLoopNodes(this, loopRootNode, event.target,
						[event.args[0], 1, event.args[1]], loopNodes, srcCtxNode);
				break;
			case 'shift':
			case 'pop':
				var nodesToRemove = loopNodes[event.method]();
				if (nodesToRemove) {
					//要素数0の配列に対してshift,popすると戻り値はundefined
					removeDomNodes(this, loopRootNode, nodesToRemove);
				}
				break;
			case 'unshift':
				var fragment = addLoopChildren(this, loopNodes, srcCtxNode, event.method,
						event.args);
				//新規追加ノードを先頭に追加
				loopRootNode.insertBefore(fragment, loopRootNode.firstChild);
				break;
			case 'push':
				var fragment = addLoopChildren(this, loopNodes, srcCtxNode, event.method,
						event.args);
				//新規追加ノードを末尾に追加
				loopRootNode.appendChild(fragment);
				break;
			case 'splice':
				spliceLoopNodes(this, loopRootNode, event.target, event.args, loopNodes, srcCtxNode);
				break;
			case 'reverse':
				//DOMツリー側をリバース
				reverseLoopNodes(loopRootNode, loopNodes);
				//保持している配列をリバース
				loopNodes.reverse();
				break;
			case 'sort':
			case 'copyFrom':
			case null:
				// sort, copyFrom またはnull(endUpdate時にdispatchEventで呼ばれた)ときはループビューをすべて作り直す
				this._loopElementsMap[viewUid] = refreshLoopContext(this, event.target,
						loopRootNode, loopNodes, srcCtxNode);
				break;
			}
		}
	}

	function hasClassBinding(bindDesc) {
		return /class\s*:/.test(bindDesc);
	}

	/**
	 * バインディングを管理します。
	 * <p>
	 * このクラスは自分でnewすることはありません。<a href="View.html#bind">view.bind()</a>を呼ぶとこのクラスのインスタンスが返ります。
	 * </p>
	 *
	 * @name Binding
	 * @class
	 */
	function Binding(target, dataContext) {
		if (target.nodeType !== undefined) {
			if (target.nodeType === NODE_TYPE_ELEMENT) {
				//エレメントノード

				//バインドターゲットの親要素
				this._parent = target.parentNode;

				this._targets = [target];
			}
		} else {
			//複数のノード

			/**
			 * バインドターゲットの親要素
			 *
			 * @name _parent
			 * @private
			 */
			this._parent = target[0].parentNode;
			/**
			 * バインドターゲット
			 *
			 * @name _targets
			 * @private
			 */
			this._targets = toArray(target);
		}

		/**
		 * このバインディングのID
		 *
		 * @name _bindRootId
		 * @private
		 */
		this._bindRootId = bindRootId++;

		//マップにこのインスタンスを登録
		bindRootIdToBindingMap[this._bindRootId] = this;

		var clonedSrc = [];

		//this._targetsは常に配列
		//初期状態のビューに、コンテキストごとに固有のIDを振っておく
		for (var i = 0, targetsLen = this._targets.length; i < targetsLen; i++) {
			var originalNode = this._targets[i];

			if (originalNode.nodeType === NODE_TYPE_ELEMENT) {
				//ルートのエレメントノードにdata-dyn-bind-rootを付与して、このBindingインスタンスを探せるようにしておく
				setElemAttribute(originalNode, DATA_H5_DYN_BIND_ROOT, this._bindRootId);

				//data-context, data-loop-contextを持つ要素にIDを付与して、オリジナルの要素を探せるようにする
				var originalContextElems = queryQualifiedElements(originalNode, [DATA_H5_CONTEXT,
						DATA_H5_LOOP_CONTEXT], undefined, true);
				for (var j = 0, orgCtxElemsLen = originalContextElems.length; j < orgCtxElemsLen; j++) {
					setElemAttribute(originalContextElems[j], DATA_H5_DYN_CTX, contextUid++);
				}

				//data-h5-bindでclassバインドしている場合、オリジナルのclassNameを保存しておく（記述されている場合のみ）
				var originalBindElems = queryQualifiedElements(originalNode, DATA_H5_BIND,
						undefined, true);
				for (var j = 0, orgBindElemsLen = originalBindElems.length; j < orgBindElemsLen; j++) {
					var originalBindElem = originalBindElems[j];
					if (hasClassBinding(getElemAttribute(originalBindElem, DATA_H5_BIND))
							&& originalBindElem.className != '') {
						setElemAttribute(originalBindElem, DATA_H5_DYN_CN,
								originalBindElem.className);
					}
				}
			}

			//保存用にクローン
			clonedSrc.push(originalNode.cloneNode(true));
		}

		/**
		 * クローンした初期状態のテンプレート
		 *
		 * @name _srces
		 * @private
		 */
		this._srces = clonedSrc;

		/**
		 * loop-contextの各インデックスがもつ要素（配列）を保持。 キー：viewUid、値：配列の配列。
		 * 値は、「あるviewUidのloop-contextのi番目（＝ここが1段目）の要素の配列（＝2段目）」になっている。
		 *
		 * @name _loopElementsMap
		 * @private
		 */
		this._loopElementsMap = {};

		/**
		 * このバインディングのルートデータコンテキスト
		 *
		 * @name _rootContext
		 * @private
		 */
		this._rootContext = dataContext;

		/**
		 * 現在適用中のデータコンテキストを入れる配列。同じインスタンスは1つしか入らない。 この配列のインデックスをキーにしてビューを探す<br>
		 * TODO インデックスをキーとして使うため、使用しなくなったオブジェクトの場所にはnullが入り、次第にスパースな配列になってしまう。<br>
		 * 二重ポインタのようにして管理すればよいが、パフォーマンスに重大な影響が出るほどスパースになることはまれと考え、Deferredする。
		 *
		 * @name _usingContexts
		 * @private
		 */
		this._usingContexts = [];

		/**
		 * ソースオブジェクト -> ビュー のマップ。1:many。 キーは_usingContextsのインデックス。 値はさらにマップで、キー：viewUid,
		 * 値：ビューインスタンス（配列）。
		 *
		 * @name _srcToViewMap
		 * @private
		 */
		this._srcToViewMap = {};

		/**
		 * バインドUID（現在表示されているDOM）にひもづけているリスナー。キー：contextIndex, 値：リスナー関数
		 *
		 * @name _listeners
		 * @private
		 */
		this._listeners = {};

		//TODO ルートが配列（LoopContext）の場合を考える
		//バインディングの初期実行
		applyBinding(this, this._targets, this._rootContext, false, true);
	}
	$.extend(Binding.prototype, {
		/**
		 * このデータバインドを解除します。
		 * <p>
		 * 解除後は、ソースオブジェクトを変更してもビューには反映されません。 ビュー（HTML）の状態は、このメソッドを呼んだ時の状態のままです。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf Binding
		 * @function
		 */
		unbind: function() {
			//全てのバインディングを解除
			for (var i = 0, len = this._targets.length; i < len; i++) {
				var target = this._targets[i];

				if (target.nodeType === NODE_TYPE_ELEMENT) {
					//バインディングを解除
					this._removeBinding(target);

					//dyn属性削除
					removeElemAttribute(target, DATA_H5_DYN_BIND_ROOT);

					var cnElems = queryQualifiedElements(target, DATA_H5_DYN_CN, undefined, true);
					for (var j = 0, cnLen = cnElems.length; j < cnLen; j++) {
						removeElemAttribute(cnElems[j], DATA_H5_DYN_CN);
					}

					var cxElems = queryQualifiedElements(target, DATA_H5_DYN_CTX, undefined, true);
					for (var j = 0, cxLen = cxElems.length; j < cxLen; j++) {
						removeElemAttribute(cxElems[j], DATA_H5_DYN_CTX);
					}
				}
			}

			//ビューとこのBindingインスタンスのマップを削除
			delete bindRootIdToBindingMap[this._bindRootId];

			//TODO リソース解放
			//unbindしたら、ノードは元に戻す？？
		},

		/*
		 * バインディングを再実行します。既存のビューは一度すべて削除されます。
		 *
		 * @since 1.1.0
		 * @memberOf Binding
		 * @function
		 * @private
		 */
		//		refresh: function() {
		//			//保存しておいたビューをクローン
		//			var fragment = document.createDocumentFragment();
		//			for ( var i = 0, len = this._srces.length; i < len; i++) {
		//				fragment.appendChild(this._srces[i].cloneNode(true));
		//			}
		//
		//			//fragmentをappendする前にノードリストをコピーしておく
		//			var newTargets = toArray(fragment.childNodes);
		//
		//			//新しいターゲットに対してバインディングを実行
		//			//TODO ルートが配列（LoopContext）の場合を考える
		//			applyBinding(this, newTargets, this._rootContext, false, true);
		//
		//			//生成したノードを今のターゲット（の最初のノード）の直前に追加して
		//			this._parent.insertBefore(fragment, this._targets[0]);
		//
		//			//既存のターゲットを削除
		//			for ( var i = 0, len = this._targets.length; i < len; i++) {
		//				this._removeBinding(this._targets[i]);
		//				this._parent.removeChild(this._targets[i]);
		//			}
		//
		//			//ターゲットのポインタを更新
		//			this._targets = newTargets;
		//		},
		/**
		 * ObservableArrayの変更に基づいて、自分が管理するビューを更新します。<br>
		 * MEMO フォーマッタが過剰にインデントしてしまうので分離している
		 *
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param event
		 */
		_observableArray_changeListener: Binding__observableArray_changeListener,

		/**
		 * データアイテムまたはObservableItemのchangeイベントハンドラ
		 *
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param event
		 */
		_observableItem_changeListener: function(event) {
			var views = this._getViewsFromSrc(event.target);
			if (!views) {
				return;
			}

			//このオブジェクトがルートコンテキストかどうか。
			//ルートコンテキストの場合、$getBindElementsInContext()において
			//対応するビューは「仮想ルート要素の子要素」としてみる必要がある。
			var isRootContext = false;
			if (event.target === this._rootContext) {
				isRootContext = true;
			}

			var that = this;

			for ( var vuid in views) {
				if (!views.hasOwnProperty(vuid)) {
					continue;
				}

				//viewはこのObservableItemにバインドされているノード配列
				var view = views[vuid];

				//自分のコンテキストに属しているバインディング対象要素を探す
				var $bindElements = $getBindElementsInContext(view, isRootContext);

				//各要素についてバインドする
				$bindElements.each(function() {
					doBind(this, event.target, true);
				});

				//自分の直接の子供のコンテキスト要素を探す
				var $childContexts = $getChildContexts(view, DATA_H5_CONTEXT);
				$childContexts.each(function() {
					var contextProp = getElemAttribute(this, DATA_H5_CONTEXT);

					if (!(contextProp in event.props)) {
						//このコンテキスト要素に対応するソースオブジェクトは変更されていない
						return true;
					}

					//子供のコンテキストの場合、仕様上あるコンテキストのルート要素は必ず単一のエレメントである

					//現在のバインディングを解除
					that._removeBinding(this);

					//対応するビューを保存してあるビューからクローンする
					var dynCtxId = getElemAttribute(this, DATA_H5_DYN_CTX);
					var srcCtxRootNode = that._getSrcCtxNode(dynCtxId);
					var cloned = cloneNodeDeeply(srcCtxRootNode);

					//新しくバインドした要素を追加し、古いビューを削除
					//(IE6は先に要素をdocumentツリーに追加しておかないと属性の変更が反映されないので先にツリーに追加)
					this.parentNode.replaceChild(cloned, this);

					//新しいコンテキストソースオブジェクトでバインディングを行う
					applyBinding(that, cloned, event.props[contextProp].newValue);
				});

				//自分の直接の子供のループルートコンテキスト要素を探す
				var $childLoopContexts = $getChildContexts(view, DATA_H5_LOOP_CONTEXT);
				$childLoopContexts.each(function() {
					var contextProp = getElemAttribute(this, DATA_H5_LOOP_CONTEXT);

					if (!(contextProp in event.props) || event.target._isArrayProp(contextProp)) {
						//このループルートコンテキスト要素に対応するソースオブジェクトは変更されていない
						//または指定されたプロパティはtype:[]なので無視
						//（ObsArrayのハンドラで処理すればよい）
						return true;
					}

					//子供のコンテキストの場合、仕様上あるコンテキストのルート要素は必ず単一のエレメントである

					//現在のバインディングを解除
					that._removeBinding(this);

					//新しいコンテキストソースオブジェクトでバインディングを行う
					//ループコンテキストなので、ルートノードはそのまま使いまわす
					applyBinding(that, this, event.props[contextProp].newValue, true);
				});
			}
		},

		/**
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param ctxId
		 */
		_getSrcCtxNode: function(ctxId) {
			for (var i = 0, len = this._srces.length; i < len; i++) {
				var src = this._srces[i];

				//ルート要素にdata-dyn-ctxがついているかチェック
				if (getElemAttribute(src, DATA_H5_DYN_CTX) === ctxId) {
					return src;
				}

				var ctxElems = queryQualifiedElements(src, DATA_H5_DYN_CTX, ctxId);
				if (ctxElems.length > 0) {
					//同じctxIdを持つ要素は1つしかない
					return ctxElems[0];
				}
			}
			return null;
		},

		/**
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param ctx
		 */
		_isWatching: function(ctx) {
			var idx = this._getContextIndex(ctx);
			if (idx === -1) {
				return false;
			}
			return this._listeners[idx] != null;
		},

		/**
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param ctx
		 */
		_getContextIndex: function(ctx) {
			return $.inArray(ctx, this._usingContexts);
		},

		/**
		 * ソースオブジェクト -> ビュー(配列) のマップエントリ、ビューUID -> ソースオブジェクト のマップエントリを追加。
		 * エントリが存在する場合は上書き（ただし、そもそも二重登録は想定外）。
		 *
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param ctx
		 * @param view
		 * @param viewUid
		 */
		_addBindingEntry: function(src, view, viewUid) {
			var srcIndex = this._getContextIndex(src);
			if (srcIndex === -1) {
				//ソースエントリ追加
				this._usingContexts.push(src);
				srcIndex = this._usingContexts.length - 1;
			}

			viewToSrcMap[viewUid] = src;

			var srcViewMap = this._srcToViewMap[srcIndex];
			if (!srcViewMap) {
				//マップオブジェクトを新規作成し、エントリ追加
				var mapObj = {};
				mapObj[viewUid] = view;
				this._srcToViewMap[srcIndex] = mapObj;
				return;
			}
			//マップエントリ追加
			srcViewMap[viewUid] = view;
		},

		/**
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param srcToViewMap
		 */
		_hasBindingForSrc: function(srcToViewMap) {
			//srcToViewMapが自分でキーを持っているということは
			//ビューへのバインディングエントリがあるということ
			for ( var key in srcToViewMap) {
				if (srcToViewMap.hasOwnProperty(key)) {
					return true;
				}
			}
			return false;
		},

		/**
		 * 特定のビューへのバインディングエントリ（ソースオブジェクト -> ビュー のマップエントリ）を削除
		 *
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param viewUid
		 */
		_removeBindingEntry: function(viewUid) {
			var src = viewToSrcMap[viewUid];

			if (!src) {
				//このviewUidが表すバインディングはすでに削除されている
				return;
			}

			var ctxIndex = this._getContextIndex(src);
			if (ctxIndex !== -1) {
				var svMap = this._srcToViewMap[ctxIndex];
				if (svMap && svMap[viewUid]) {
					//ソースオブジェクト -> ビュー（viewUid経由） のマップエントリを削除
					delete svMap[viewUid];

					if (!this._hasBindingForSrc(svMap)) {
						var removed = false;
						//このオブジェクトの監視が不要（他にバインドされているビューがない）になった場合、リスナーを削除
						if (isObservableItem(src)) {
							src.removeEventListener('change', this._listeners[ctxIndex]);
							removed = true;
						} else if (h5.core.data.isObservableArray(src)) {
							src.removeEventListener('change', this._listeners[ctxIndex]);
							removed = true;
						}

						if (removed) {
							delete this._listeners[ctxIndex];
						}

						//このソースを監視する必要がなくなったので、マップそのものを削除
						delete this._srcToViewMap[ctxIndex];
						this._usingContexts[ctxIndex] = null;

					}
				}
			}

			if (viewToSrcMap[viewUid]) {
				//viewUid -> ソースオブジェクト のマップエントリを削除
				delete viewToSrcMap[viewUid];
			}
		},

		/**
		 * 指定された要素以下のバインディングを全て解除
		 *
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param rootElem
		 */
		_removeBinding: function(rootElem) {
			if (rootElem.nodeType !== NODE_TYPE_ELEMENT) {
				//バインド可能なのはエレメントのみなので、ルートがELEMENTノードでない場合はバインディングはない
				return;
			}

			//渡された要素自身がviewUidを持っていたら、まずその要素のバインディングエントリを削除
			//ここでは、必ず自分自身のエントリが最初に削除されるように、queryQualifiedElementsを使わず独自に削除している
			var rootVid = getElemAttribute(rootElem, DATA_H5_DYN_VID);
			if (rootVid != null) {
				this._removeBindingEntry(rootVid);
				removeElemAttribute(rootElem, DATA_H5_DYN_VID);
			}

			//子孫要素のバインディングエントリを削除
			var vidElems = queryQualifiedElements(rootElem, DATA_H5_DYN_VID);
			for (var i = 0, len = vidElems.length; i < len; i++) {
				var vidElem = vidElems[i];
				this._removeBindingEntry(getElemAttribute(vidElem, DATA_H5_DYN_VID));
				removeElemAttribute(vidElem, DATA_H5_DYN_VID);
			}
		},

		/**
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param src
		 */
		_getViewsFromSrc: function(src) {
			var srcIndex = this._getContextIndex(src);
			if (srcIndex === -1) {
				return null;
			}
			return this._srcToViewMap[srcIndex];
		}

	});

	function createBinding(elements, context) {
		return new Binding(elements, context);
	}

	// =============================
	// Expose to window
	// =============================

	h5internal.view = {
		createBinding: createBinding
	};

})();
/* ------ h5.ui ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/**
	 * メッセージを表示する要素のクラス名
	 */
	var CLASS_INDICATOR_THROBBER = 'indicator-throbber';

	/**
	 * スロバーを表示する要素のクラス名
	 */
	var CLASS_INDICATOR_MESSAGE = 'indicator-message';

	/**
	 * スロバー本体(Canvas)に付与するクラス名
	 */
	var CLASS_THROBBER_CANVAS = 'throbber-canvas';

	/**
	 * スロバー内に進捗率(パーセント)を表示する要素のクラス名
	 */
	var CLASS_THROBBER_PERCENT = 'throbber-percent';

	/**
	 * インジケータ - ルートのクラス名
	 */
	var CLASS_INDICATOR_ROOT = 'h5-indicator';

	/**
	 * インジケータ - メッセージのクラス名
	 */
	var CLASS_INDICATOR_CONTENT = 'content';

	/**
	 * インジケータ - オーバーレイのクラス名
	 */
	var CLASS_OVERLAY = 'overlay';

	/**
	 * インジケータ - オーバーレイのクラス名
	 * <p>
	 * IE6でのみ使用する。
	 */
	var CLASS_SKIN = 'skin';

	/**
	 * 一番外側にあるVML要素のクラス名
	 */
	var CLASS_VML_ROOT = 'vml-root';

	/**
	 * VMLのスタイル定義要素(style要素)のid
	 */
	var ID_VML_STYLE = 'h5-vmlstyle';

	/**
	 * メッセージに要素に表示する文字列のフォーマット
	 */
	var FORMAT_THROBBER_MESSAGE_AREA = '<span class="' + CLASS_INDICATOR_THROBBER
			+ '"></span><span class="' + CLASS_INDICATOR_MESSAGE + '" {0}>{1}</span>';

	/**
	 * jQuery.data()で使用するキー名
	 * <p>
	 * インジケータ表示前のスタイル、positionプロパティの値を保持するために使用する
	 */
	var DATA_KEY_POSITION = 'before-position';

	/**
	 * jQuery.data()で使用するキー名
	 * <p>
	 * インジケータ表示前のスタイル、zoomプロパティの値を保持するために使用する
	 */
	var DATA_KEY_ZOOM = 'before-zoom';

	/**
	 * scrollToTop() リトライまでの待機時間
	 */
	var WAIT_MILLIS = 500;

	/**
	 * アニメーション(fadeIn,fadeOut)するときの1フレームの時間(ms)
	 * <p>
	 * jQuery.fx.intervalがデフォルトで13なので、それに倣って13を指定している
	 * </p>
	 */
	var ANIMATION_INTERVAL = 13;


	// =============================
	// Development Only
	// =============================

	/* del begin */
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	var h5ua = h5.env.ua;
	var isJQueryObject = h5.u.obj.isJQueryObject;
	var argsToArray = h5.u.obj.argsToArray;

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	// =============================
	// Variables
	// =============================
	// h5.cssを読み込んで、Canvas版スロバーに適用するスタイルの情報を保持するマップ
	// key:クラス名  value:CSSプロパティ名
	var throbberStyleMap = {
		throbber: ['width', 'height'],
		'throbber-line': ['width', 'color']
	};

	/**
	 * Canvasをサポートしているか
	 * <p>
	 * (true:サポート/false:未サポート)
	 */
	var isCanvasSupported = !!document.createElement('canvas').getContext;

	/**
	 * VMLをサポートしているか (true:サポート/false:未サポート)
	 */
	// 機能ベースでVMLのサポート判定を行う(IE6,7,8,9:true その他のブラウザ:false)
	var isVMLSupported = (function() {
		var fragment = document.createDocumentFragment();
		var div = fragment.appendChild(document.createElement('div'));
		div.innerHTML = '<v:line strokeweight="1"/>';
		var child = div.firstChild;
		child.style.behavior = 'url(#default#VML)';
		return typeof child.strokeweight === 'number';
	})();

	/**
	 * 互換モードか判定します
	 */
	var compatMode = (document.compatMode !== 'CSS1Compat');

	/**
	 * 対象ブラウザがIE6以前のブラウザか
	 */
	var isLegacyIE = h5ua.isIE && h5ua.browserVersion <= 6;

	/**
	 * position:fixedでインジケータを描画するかのフラグ。
	 * <p>
	 * 自動更新またはアップデート可能なブラウザは、最新のブラウザであるものとして判定しない。(常にposition:fixedは有効とする)
	 * <p>
	 * 以下の理由から、機能ベースでの判定は行わない。
	 * <ul>
	 * <li>$.support.fixedPosition()にバグがあり、モバイルブラウザの判定が正しくない。</li>
	 * <li>jQuery1.8では、$.support.fixedPosition()が無くなっている。 (fixedPositionを判定するAPIが無い)</li>
	 * <li>機能ベースでモバイル・デスクトップの両方を検知するのは困難。</li>
	 * </ul>
	 * <p>
	 * <b>position:fixedについて</b>
	 * <ul>
	 * <li>position:fixed対応表: http://caniuse.com/css-fixed</li>
	 * <li>Androidは2.2からposition:fixedをサポートしており、2.2と2.3はmetaタグに「user-scalable=no」が設定されていないと機能しない。<br>
	 * http://blog.webcreativepark.net/2011/12/07-052517.html </li>
	 * <li>Androidのデフォルトブラウザでposition:fixedを使用すると、2.xはkeyframesとtransformをposition:fixedで使用すると正しい位置に表示されないバグが、4.xは画面の向きが変更されると描画が崩れるバグがあるため使用しない。
	 * <li>Windows Phoneは7.0/7.5ともに未サポート https://github.com/jquery/jquery-mobile/issues/3489</li>
	 * <ul>
	 */
	var usePositionFixed = !(h5ua.isAndroidDefaultBrowser
			|| (h5ua.isiOS && h5ua.browserVersion < 5) || isLegacyIE || compatMode || h5ua.isWindowsPhone);

	/**
	 * CSS3 Animationsをサポートしているか
	 * <p>
	 * (true:サポート/false:未サポート)
	 */
	var isCSS3AnimationsSupported = null;

	/**
	 * ウィンドウの高さを取得するメソッド
	 */
	var windowHeight = null;

	/**
	 * ドキュメントの高さを取得するメソッド
	 */
	var documentHeight = null;

	/**
	 * ドキュメントの高さを取得するメソッド
	 */
	var documentWidth = null;

	/**
	 * Y方向のスクロール値を取得するメソッド
	 */
	var scrollTop = null;

	/**
	 * Y方向のスクロール値を取得するメソッド
	 */
	var scrollLeft = null;

	// =============================
	// Functions
	// =============================

	/**
	 * 指定されたCSS3プロパティをサポートしているか判定します。
	 * <p>
	 * プレフィックスなし、プレフィックスありでサポート判定を行います。
	 * <p>
	 * 判定に使用するプレフィックス
	 * <ul>
	 * <li>Khtml (Safari2以前)</li>
	 * <li>ms (IE)</li>
	 * <li>O (Opera)</li>
	 * <li>Moz (Firefox)</li>
	 * <li>Webkit (Safari2以降/Chrome)</li>
	 * </ul>
	 * <p>
	 * ※Chrome20にて、WebKitプレフィックスはデバッグでの表示上は小文字(webkitXxxxx)だが、先頭文字が小文字または大文字でも正しく判定される。
	 * しかし、古いバージョンでは確認できていないため『Webkit』で判定する。
	 */
	var supportsCSS3Property = (function() {
		var fragment = document.createDocumentFragment();
		var div = fragment.appendChild(document.createElement('div'));
		var prefixes = 'Webkit Moz O ms Khtml'.split(' ');
		var len = prefixes.length;

		return function(propName) {
			// CSSシンタックス(ハイフン区切りの文字列)をキャメルケースに変換
			var propCamel = $.camelCase(propName);

			// ベンダープレフィックスなしでサポートしているか判定
			if (propCamel in div.style) {
				return true;
			}

			propCamel = propCamel.charAt(0).toUpperCase() + propCamel.slice(1);

			// ベンダープレフィックスありでサポートしているか判定
			for (var i = 0; i < len; i++) {
				if (prefixes[i] + propCamel in div.style) {
					return true;
				}
			}

			return false;
		};
	})();

	/**
	 * CSSファイルに書かれた、Canvasのスタイル定義を取得します。
	 */
	function readThrobberStyle(theme) {
		var readStyles = {};

		for ( var prop in throbberStyleMap) {
			var $elem = $('<div></div>').addClass(theme).addClass(prop).appendTo('body');
			var propCamel = $.camelCase(prop);

			readStyles[propCamel] = {};

			$.map(throbberStyleMap[prop], function(item, idx) {
				if (item === 'width' || item === 'height') {
					readStyles[propCamel][item] = parseInt($elem.css(item).replace(/\D/g, ''), 10);
				} else {
					readStyles[propCamel][item] = $elem.css(item);
				}
			});

			$elem.remove();
		}

		return readStyles;
	}

	/**
	 * VML要素を生成します。
	 */
	function createVMLElement(tagName, doc, opt) {
		var elem = doc.createElement('v:' + tagName);

		for ( var prop in opt) {
			elem.style[prop] = opt[prop];
		}

		return elem;
	}

	/**
	 * 要素のサイズから、スロバーの線を引く座標を計算します。
	 */
	function calculateLineCoords(size, line) {
		var positions = [];
		var centerPos = size / 2;
		var radius = size * 0.8 / 2;
		var eachRadian = 360 / line * Math.PI / 180;

		for (var j = 1; j <= line; j++) {
			var rad = eachRadian * j;
			var cosRad = Math.cos(rad), sinRad = Math.sin(rad);
			positions.push({
				from: {
					x: centerPos + radius / 2 * cosRad,
					y: centerPos + radius / 2 * sinRad
				},
				to: {
					x: centerPos + radius * cosRad,
					y: centerPos + radius * sinRad
				}
			});
		}

		return positions;
	}

	/**
	 * 任意要素のスクロールサイズ(scrollWidth/Height：見た目でなくコンテンツ全体のサイズ)を取得します。
	 * IE6は内包する要素の方が小さい場合にscrollサイズがclientサイズより小さくなってしまうバグがあります（本来はscroll===client）。
	 * そこで、IE6の場合はscrollとclientのうち大きい方のサイズを返します。<br>
	 * また、scrollW/Hは整数を返しますが、内部的にはサイズが小数になっている場合があります。Chrome22, Firefox20,
	 * Opera12ではscrollサイズをセットしても問題ありませんが、IEの場合
	 * (内部サイズが小数のときに)scrollW/Hの大きさでオーバーレイのサイズを設定すると意図しないスクロールバーが出てしまう場合があります。
	 * このメソッドは、IEかつ内部に小数を取り得る環境と判断した場合この誤差を調整してこの問題を回避します。
	 *
	 * @private
	 * @param elem {Element} DOM要素
	 * @returns {Object}
	 */
	function getScrollSize(elem) {
		var retW = elem.scrollWidth;
		var retH = elem.scrollHeight;

		if (isLegacyIE) {
			retW = Math.max(retW, elem.clientWidth);
			retH = Math.max(retH, elem.clientHeight);
		} else if (h5ua.isIE && typeof getComputedStyle === 'function') {
			//getComputedStyleが未定義な環境(IE)でエラーにならないように、typeofを使って判定

			//IE9以上(かつIE9モード以上)。この場合、ボックスサイズが小数になる可能性がある
			//(IE8orIE8モード以下の場合常に整数で計算されるので、scrollサイズを使えばよい)。
			//ComputedStyleで厳密なサイズを取得し、その分を調整することで
			//意図しないスクロールバーが出ないようにする。
			//-1しているのは四捨五入させるため(描画の際はピクセルにスナップされるようなので)。

			// エレメントが別ウィンドウの場合もあるので、elemの属するwindowのgetComputedStyleを使用
			var comStyle = getWindowOfDocument(getDocumentOf(elem)).getComputedStyle(elem, null);

			var eW = parseFloat(comStyle.width) + parseFloat(comStyle.paddingLeft)
					+ parseFloat(comStyle.paddingRight);
			retW += eW - parseInt(eW) - 1;

			var eH = parseFloat(comStyle.height) + parseFloat(comStyle.paddingTop)
					+ parseFloat(comStyle.paddingBottom);
			retH += eH - parseInt(eH) - 1;
		}

		return {
			w: retW,
			h: retH
		};
	}

	/**
	 * ドキュメント(コンテンツ全体)の高さまたは幅を取得します。
	 * <p>
	 * ウィンドウの高さを取得したい場合は引数に"Height"を、 ウィンドウの幅を取得したい場合は引数に"Width"を指定して下さい。
	 * <p>
	 * 以下のバグがあるため自前で計算を行う。
	 * <p>
	 * 1.6.4/1.7.1/1.8.0は正しい値を返すが1.7.1ではバグがあるため正しい値を返さない。<br>
	 * http://bugs.jquery.com/ticket/3838<br>
	 * http://pastebin.com/MaUuLjU2
	 * <p>
	 * IE6だと同一要素に対してスタイルにwidthとpaddingを指定するとサイズがおかしくなる。<br>
	 * http://hiromedo-net.sakura.ne.jp/memoblog/?p=47
	 */
	function documentSize(propName) {
		var prop = propName;

		return function() {
			var body = document.body;
			var docElem = document.documentElement;
			// 互換モードの場合はサイズ計算にbody要素を、IE6標準の場合はdocumentElementを使用する
			var elem = compatMode ? body : isLegacyIE ? docElem : null;

			if (elem) {
				if (prop === 'Height') {
					// ウィンドウサイズを大きくすると、scroll[Width/Height]よりもclient[Width/Height]の値のほうが大きくなるため、
					// client[Width/Height]のほうが大きい場合はこの値を返す
					return elem['client' + prop] > elem['scroll' + prop] ? elem['client' + prop]
							: elem['scroll' + prop];
				}
				return elem['client' + prop];
			}
			return Math.max(body['scroll' + prop], docElem['scroll' + prop], body['offset' + prop],
					docElem['offset' + prop], docElem['client' + prop]);

		};
	}

	/**
	 * スクロールバーの幅も含めた、ウィンドウ幅または高さを取得します。
	 * <p>
	 * ウィンドウの高さを取得したい場合は引数に"Height"を、 ウィンドウの幅を取得したい場合は引数に"Width"を指定して下さい。
	 * <p>
	 * jQuery1.8からQuirksモードをサポートしていないため、$(window).height()からウィンドウサイズを取得できない(0を返す)ため、自前で計算を行う。<br>
	 * http://blog.jquery.com/2012/08/30/jquery-1-8-1-released/
	 */
	function windowSize(propName) {
		var prop = propName;

		return function() {
			var body = document.body;
			var docElem = document.documentElement;
			return (typeof window['inner' + prop] === 'number') ? window['inner' + prop]
					: compatMode ? body['client' + prop] : docElem['client' + prop];
		};
	}

	/**
	 * Y方向またはX方向のスクロール量を取得します。
	 * <p>
	 * Y方向のスクロール量を取得したい場合は引数に"Top"を、 X方向のスクロール量を取得したい場合は引数に"Left"を指定して下さい。
	 */
	function scrollPosition(propName) {
		var prop = propName;

		return function() {
			// doctypeが「XHTML1.0 Transitional DTD」だと、document.documentElement.scrollTopが0を返すので、互換モードを判定する
			// http://mokumoku.mydns.jp/dok/88.html
			var elem = compatMode ? document.body : document.documentElement;
			var offsetProp = (prop === 'Top') ? 'Y' : 'X';
			return window['page' + offsetProp + 'Offset'] || elem['scroll' + prop];
		};
	}

	/**
	 * スクロールバーの幅を含めない、ウィンドウ幅または高さを取得します。
	 */
	function getDisplayArea(prop) {
		var e = compatMode ? document.body : document.documentElement;
		return h5ua.isiOS ? window['inner' + prop] : e['client' + prop];
	}

	/**
	 * 指定された要素の左上からの絶対座標を取得します。
	 * <p>
	 * 1.8.xのjQuery.offset()は、Quirksモードでのスクロール量の計算が正しく行われないため自前で計算する。
	 * </p>
	 * <p>
	 * 絶対座標は、
	 *
	 * <pre>
	 * getBoundingClinetRectの値 + スクロール量 - clientTop / Left
	 * </pre>
	 *
	 * で計算します。
	 * </p>
	 * <p>
	 * IE6の場合、BODY要素についてgetBoundingClientRect()の値が正しく計算できず、
	 * また、HTML要素のmargin,borderが表示されないので、BODY要素の場合は、htmlのpadding～bodyのborderまでを加えた値を計算して返します。
	 * </p>
	 */
	function getOffset(element) {
		var elem = $(element)[0];
		var body = document.body;
		var html = $('html')[0];
		var box = {
			top: 0,
			left: 0
		};
		if (elem === body && isLegacyIE) {
			return {
				top: parseFloat(html.currentStyle.paddingTop || 0)
						+ parseFloat(body.currentStyle.marginTop || 0)
						+ parseFloat(body.currentStyle.borderTop || 0),
				left: parseFloat(html.currentStyle.paddingLeft || 0)
						+ parseFloat(body.currentStyle.marginLeft || 0)
						+ parseFloat(body.currentStyle.borderLeft || 0)
			};
		}

		if (typeof elem.getBoundingClientRect !== "undefined") {
			box = elem.getBoundingClientRect();
		}

		var docElem = compatMode ? body : document.documentElement;
		var clientTop = docElem.clientTop || 0;
		var clientLeft = docElem.clientLeft || 0;

		return {
			top: box.top + scrollTop() - clientTop,
			left: box.left + scrollLeft() - clientLeft
		};

	}

	/**
	 * 指定された要素で発生したイベントを無効にする
	 */
	function disableEventOnIndicator(/* var_args */) {
		var disabledEventTypes = 'click dblclick touchstart touchmove touchend mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave focus focusin focusout blur change select';

		$.each(argsToArray(arguments), function(i, e) {
			e.bind(disabledEventTypes, function() {
				return false;
			});
		});
	}

	/**
	 * スクリーンロック対象の要素か判定します。
	 */
	function isScreenlockTarget(element) {
		var e = isJQueryObject(element) ? element[0] : element;
		return e === window || e === document || e === document.body;
	}

	/**
	 * VMLが機能するよう名前空間とVML要素用のスタイルを定義する(VML用)
	 */
	function defineVMLNamespaceAndStyle(doc) {
		// 既に定義済みなら何もしない
		if (doc.getElementById(ID_VML_STYLE)) {
			return;
		}

		doc.namespaces.add('v', 'urn:schemas-microsoft-com:vml');
		// メモリリークとIE9で動作しない問題があるため、document.createStyleSheet()は使用しない
		var vmlStyle = doc.createElement('style');
		doc.getElementsByTagName('head')[0].appendChild(vmlStyle);

		vmlStyle.id = ID_VML_STYLE;
		var styleDef = ['v\\:stroke', 'v\\:line', 'v\\:textbox'].join(',')
				+ ' { behavior:url(#default#VML); }';
		vmlStyle.setAttribute('type', 'text/css');
		vmlStyle.styleSheet.cssText = styleDef;
	}

	/**
	 * getComputedStyleがあるブラウザについて、getComputedStyleを呼び出した結果を返します。
	 * <p>
	 * 渡されたエレメントが属するdocumentツリーのwindowオブジェクトのgetComputedStyleを使用します
	 * </p>
	 *
	 * @private
	 * @param {DOM} elem
	 * @returns {Style} elemのcomputedStyle
	 */
	function getComputedStyleObject(elem) {
		return getWindowOf(elem).getComputedStyle(elem, null);
	}

	/**
	 * スタイルを取得する
	 * <p>
	 * IEでjQuery1.8.X～1.10.Xを使用した時、ポップアップウィンドウ内の要素についてスタイルを取得しようとするとエラーになるため、ラップしている。
	 * </p>
	 * <p>
	 * getComputedStyleがないブラウザについては、jQuery.css()を使って取得した値を返す。
	 * </p>
	 *
	 * @private
	 * @param elem {DOM}
	 * @param prop {String} CSSプロパティ
	 * @returns 第1引数について、computedStyleを取得し、第2引数に指定されたプロパティの値を返す
	 */
	function getComputedStyleValue(elem, prop) {
		if (!getWindowOf(elem).getComputedStyle) {
			return $(elem).css(prop);
		}
		return getComputedStyleObject(elem)[prop];
	}

	/**
	 * 要素のheight(offsetHeight)を取得する
	 * <p>
	 * IEでjQuery1.8.X～1.10.Xを使用した時、ポップアップウィンドウ内の要素についてスタイルを取得しようとするとエラーになるため、ラップしている。
	 * </p>
	 * <p>
	 * getComputedStyleがないブラウザについては、height()で取得した値を返す。
	 * </p>
	 *
	 * @private
	 * @param {DOM} elem
	 * @returns {Number} 引数で渡された要素のheight
	 */
	function getHeight(elem) {
		if (!getWindowOf(elem).getComputedStyle) {
			return $(elem).height();
		}
		var elemStyle = getComputedStyleObject(elem);
		return elem.offsetHeight - parseFloat(elemStyle.paddingTop)
				- parseFloat(elemStyle.paddingBottom);
	}

	/**
	 * 要素のwidth(offsetWidth)を取得する
	 * <p>
	 * IEでjQuery1.8.X～1.10.Xを使用した時、ポップアップウィンドウ内の要素についてスタイルを取得しようとするとエラーになるため、ラップしている。
	 * </p>
	 * <p>
	 * getComputedStyleがないブラウザについては、width()で取得した値を返す。
	 * </p>
	 *
	 * @private
	 * @param {DOM} elem
	 * @returns {Number} 引数で渡された要素のwidth
	 */
	function getWidth(elem) {
		if (!getWindowOf(elem).getComputedStyle) {
			return $(elem).width();
		}
		var elemStyle = getComputedStyleObject(elem);
		return elem.offsetWidth - parseFloat(elemStyle.paddingLeft)
				- parseFloat(elemStyle.paddingRight);
	}

	/**
	 * 要素のouterHeightを取得する
	 * <p>
	 * IEでjQuery1.8.X～1.10.Xを使用した時、ポップアップウィンドウ内の要素についてスタイルを取得しようとするとエラーになるため、ラップしている。
	 * </p>
	 * <p>
	 * getComputedStyleがないブラウザについては、outerHeight()で取得した値を返す。
	 * </p>
	 *
	 * @private
	 * @param {DOM} elem
	 * @param {Boolean} [includeMargin=true] maginを含めるかどうか
	 * @returns {Number} 引数で渡された要素のouterHeight
	 */
	function getOuterHeight(elem, includeMargin) {
		if (!getWindowOf(elem).getComputedStyle) {
			return $(elem).outerHeight();
		}

		var elemStyle = getComputedStyleObject(elem);
		return getHeight(elem)
				+ parseFloat(elemStyle.paddingTop)
				+ parseFloat(elemStyle.paddingBottom)
				+ parseFloat(elemStyle.borderTopWidth)
				+ parseFloat(elemStyle.borderBottomWidth)
				+ (includeMargin ? (parseFloat(elemStyle.marginTop) + parseFloat(elemStyle.marginBottom))
						: 0);
	}

	/**
	 * 要素のouterWidthを取得する
	 * <p>
	 * IEでjQuery1.8.X～1.10.Xを使用した時、ポップアップウィンドウ内の要素についてスタイルを取得しようとするとエラーになるため、ラップしている。
	 * </p>
	 * <p>
	 * getComputedStyleがないブラウザについては、outerWidth()で取得した値を返す。
	 * </p>
	 *
	 * @param {DOM} elem
	 * @param {Boolean} [includeMargin=true] maginを含めるかどうか
	 * @returns {Number} 引数で渡された要素のouterWidth
	 */
	function getOuterWidth(elem, includeMargin) {
		if (!getWindowOf(elem).getComputedStyle) {
			return $(elem).outerWidth();
		}
		var elemStyle = getComputedStyleObject(elem);
		return getWidth(elem)
				+ parseFloat(elemStyle.paddingLeft)
				+ parseFloat(elemStyle.paddingRight)
				+ parseFloat(elemStyle.borderLeftWidth)
				+ parseFloat(elemStyle.borderRightWidth)
				+ (includeMargin ? (parseFloat(elemStyle.marginLeft) + parseFloat(elemStyle.marginRight))
						: 0);
	}

	/**
	 * 要素のinnerHeightを取得する
	 * <p>
	 * IEでjQuery1.8.X～1.10.Xを使用した時、ポップアップウィンドウ内の要素についてスタイルを取得しようとするとエラーになるため、ラップしている。
	 * </p>
	 * <p>
	 * getComputedStyleがないブラウザについては、innerHeight()で取得した値を返す。
	 * </p>
	 *
	 * @param {DOM} elem
	 * @returns {Number} 引数で渡された要素のinnerHeight
	 */
	function getInnerHeight(elem) {
		if (!getWindowOf(elem).getComputedStyle) {
			return $(elem).innerHeight();
		}
		var elemStyle = getComputedStyleObject(elem);
		return getHeight(elem) + parseFloat(elemStyle.paddingTop)
				+ parseFloat(elemStyle.paddingBottom);
	}

	/**
	 * 要素のinnerWidthを取得する
	 * <p>
	 * IEでjQuery1.8.X～1.10.Xを使用した時、ポップアップウィンドウ内の要素についてスタイルを取得しようとするとエラーになるため、ラップしている。
	 * </p>
	 * <p>
	 * getComputedStyleがないブラウザについては、innerWidth()で取得した値を返す。
	 * </p>
	 *
	 * @param {DOM} elem
	 * @returns {Number} 引数で渡された要素のinnerWidth
	 */
	function getInnerWidth(elem) {
		if (!getWindowOf(elem).getComputedStyle) {
			return $(elem).innerWidth();
		}
		var elemStyle = getComputedStyleObject(elem);
		return getWidth(elem) + parseFloat(elemStyle.paddingLeft)
				+ parseFloat(elemStyle.paddingRight);
	}

	/**
	 * fadeIn, fadeOut用のアニメーション関数
	 *
	 * @param {Array} props $elemのアニメーション終了時のスタイルの配列。propsの配列のインデックスは$elemのインデックスに対応する。
	 * @param {jQuery} $elem アニメーションさせる要素
	 * @param {Number} time アニメーションに掛ける時間
	 * @param {Function} callback アニメーション終了時に実行するコールバック関数
	 */
	function animate(props, $elem, time, callback) {
		var interval = ANIMATION_INTERVAL;
		var count = 0;
		// 現在の値(アニメーションするごとに変化)
		var curProps = [];
		// 1インターバルごとに変化する量
		var v = [];
		// 現在のスタイルを$elemの最初の要素から取得し、それを基準にアニメーションする
		$elem.each(function(i) {
			var prop = props[i];
			v[i] = {};
			curProps[i] = {};
			var curStyle = getComputedStyleObject($elem[i]);
			for ( var p in prop) {
				curProps[i][p] = parseFloat(curStyle[p]);
				v[i][p] = (parseFloat(prop[p]) - parseFloat(curStyle[p])) * interval / time;
			}
		});
		function fn() {
			count += interval;
			if (count > time) {
				// アニメーション終了
				clearInterval(timerId);
				// スタイルを削除して、デフォルト(cssなどで指定されている値)に戻す
				$elem.each(function(i) {
					for ( var p in props[i]) {
						this.style[p] = '';
					}
				});
				callback();
				return;
			}
			$elem.each(function(i) {
				var curProp = curProps[i];
				for ( var p in curProp) {
					curProp[p] += v[i][p];
				}
				$(this).css(curProp);
			});
		}
		fn();
		var timerId = setInterval(fn, interval);
	}

	/**
	 * opacityを0から、現在の要素のopacityの値までアニメーションします
	 *
	 * @param {jQuery} $elem fadeInさせる要素
	 * @param {Number} time アニメーションに掛ける時間(ms)
	 * @param {Function} callback アニメーションが終了した時に呼び出すコールバック関数
	 */
	function fadeIn($elem, time, callback) {
		// 現在のopacityを取得
		var opacities = [];
		$elem.each(function() {
			var opacity = parseFloat(getComputedStyleValue(this, 'opacity'));
			opacities.push({
				opacity: opacity
			});
		});
		// opacityを0にして、display:blockにする
		$elem.css({
			opacity: 0,
			display: 'block'
		});
		animate(opacities, $elem, time, callback);
	}

	/**
	 * opacityを現在の値から、0までアニメーションします
	 *
	 * @param {jQuery} $elem fadeOutさせる要素
	 * @param {Number} time アニメーションに掛ける時間(ms)
	 * @param {Function} callback アニメーションが終了した時に呼び出すコールバック関数
	 */
	function fadeOut($elem, time, callback) {
		var opacities = [];
		$elem.each(function() {
			opacities.push({
				opacity: 0
			});
		});
		animate(opacities, $elem, time, callback);
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	windowHeight = windowSize('Height');
	documentHeight = documentSize('Height');
	documentWidth = documentSize('Width');
	scrollTop = scrollPosition('Top');
	scrollLeft = scrollPosition('Left');

	// CSS3 Animationのサポート判定
	isCSS3AnimationsSupported = supportsCSS3Property('animationName');

	/**
	 * VML版スロバー (IE 6,7,8)用
	 */
	function ThrobberVML(opt, doc) {
		this.style = $.extend(true, {}, opt);

		// documentにVMLの名前空間とスタイルが定義されていなかったら、定義する
		defineVMLNamespaceAndStyle(doc);

		var w = this.style.throbber.width;
		var h = this.style.throbber.height;

		this.group = createVMLElement('group', doc, {
			width: w + 'px',
			height: h + 'px'
		});
		this.group.className = CLASS_VML_ROOT;

		var positions = calculateLineCoords(w, this.style.throbber.lines);
		var lineColor = this.style.throbberLine.color;
		var lineWidth = this.style.throbberLine.width;

		for (var i = 0, len = positions.length; i < len; i++) {
			var pos = positions[i];
			var from = pos.from;
			var to = pos.to;
			var e = createVMLElement('line', doc);
			e.strokeweight = lineWidth;
			e.strokecolor = lineColor;
			e.fillcolor = lineColor;
			e.from = from.x + ',' + from.y;
			e.to = to.x + ',' + to.y;
			var ce = createVMLElement('stroke', doc);
			ce.opacity = 1;
			e.appendChild(ce);
			this.group.appendChild(e);
		}

		this._createPercentArea(doc);
	}

	ThrobberVML.prototype = {
		show: function(root) {
			if (!root) {
				return;
			}

			this.root = root;
			this.highlightPos = 1;
			this.hide();
			this.root.appendChild(this.group);
			this._run();
		},
		hide: function() {
			this.root.innerHTML = "";

			if (this._runId) {
				clearTimeout(this._runId);
				this._runId = null;
			}
		},
		_run: function() {
			var lineCount = this.style.throbber.lines;
			if (lineCount === 0) {
				// ラインの数が0なら何もしない
				return;
			}
			var roundTime = this.style.throbber.roundTime;
			var highlightPos = this.highlightPos;
			var lines = this.group.childNodes;

			for (var i = 0, len = lines.length; i < len; i++) {
				var child = lines[i];

				if (child.nodeName === 'textbox') {
					continue;
				}

				var lineNum = i + 1;
				var line = child.firstChild;
				if (lineNum == highlightPos) {
					line.opacity = "1";
				} else if (lineNum == highlightPos + 1 || lineNum == highlightPos - 1) {
					line.opacity = "0.75";
				} else {
					line.opacity = "0.4";
				}
			}

			if (highlightPos == lineCount) {
				highlightPos = 0;
			} else {
				highlightPos++;
			}

			this.highlightPos = highlightPos;
			var perMills = Math.floor(roundTime / lineCount);

			var that = this;

			// VML版スロバーはIE8以下専用でかつ、IE8以下はAnimations/Transformに対応していないのでsetTimeoutでスロバーを描写する
			this._runId = setTimeout(function() {
				that._run.call(that);
			}, perMills);
		},
		_createPercentArea: function(doc) {
			var textPath = createVMLElement('textbox', doc);
			var $table = $(doc.createElement('table'));
			$table.append('<tr><td></td></tr>');
			var $td = $table.find('td');
			$td.width(this.group.style.width);
			$td.height(this.group.style.height);
			$td.css('line-height', this.group.style.height);
			$td.addClass(CLASS_THROBBER_PERCENT);

			textPath.appendChild($table[0]);
			this.group.appendChild(textPath);
		},
		setPercent: function(percent) {
			$(this.group).find('.' + CLASS_THROBBER_PERCENT).html(percent);
		}
	};

	/**
	 * Canvas版スロバー
	 */
	var ThrobberCanvas = function(opt, doc) {
		this.style = $.extend(true, {}, opt);
		this.canvas = doc.createElement('canvas');
		this.baseDiv = doc.createElement('div');
		this.percentDiv = doc.createElement('div');

		var canvas = this.canvas;
		var baseDiv = this.baseDiv;
		var percentDiv = this.percentDiv;
		// CSSファイルから読み取ったスタイルをCanvasに適用する
		canvas.width = this.style.throbber.width;
		canvas.height = this.style.throbber.height;
		canvas.style.display = 'block';
		canvas.style.position = 'absolute';
		baseDiv.style.width = this.style.throbber.width + 'px';
		baseDiv.style.height = this.style.throbber.height + 'px';
		baseDiv.appendChild(canvas);
		// パーセント表示用DIV
		percentDiv.style.width = this.style.throbber.width + 'px';
		percentDiv.style.height = this.style.throbber.height + 'px';
		percentDiv.style.lineHeight = this.style.throbber.height + 'px';
		percentDiv.className = CLASS_THROBBER_PERCENT;
		baseDiv.appendChild(percentDiv);

		this.positions = calculateLineCoords(canvas.width, this.style.throbber.lines);
	};

	ThrobberCanvas.prototype = {
		show: function(root) {
			if (!root) {
				return;
			}

			this.root = root;
			this.highlightPos = 1;
			this.hide();
			this.root.appendChild(this.baseDiv);
			this._run();
		},
		hide: function() {
			// this.root.innerHTML = ''だと、IEにてthis.child.innerHTMLまで空になってしまう
			// removeChildを使うとDOMがない時にエラーが出るため、jQueryのremove()を使っている
			$(this.baseDiv).remove();

			if (this._runId) {
				// Timerで動かしている場合(CSSAnimationをサポートしていないためにTimerで動かしている場合)
				// Timerを止める
				clearTimeout(this._runId);
				this._runId = null;
			}
		},
		_run: function() {
			var lineCount = this.style.throbber.lines;
			if (lineCount === 0) {
				// lineの数が0なら何もしない
				return;
			}
			var canvas = this.canvas;
			var ctx = canvas.getContext('2d');
			var highlightPos = this.highlightPos;
			var positions = this.positions;
			var lineColor = this.style.throbberLine.color;
			var lineWidth = this.style.throbberLine.width;
			var roundTime = this.style.throbber.roundTime;

			canvas.width = canvas.width;

			for (var i = 0, len = positions.length; i < len; i++) {
				ctx.beginPath();
				ctx.strokeStyle = lineColor;
				ctx.lineWidth = lineWidth;
				var lineNum = i + 1;
				if (lineNum == highlightPos) {
					ctx.globalAlpha = 1;
				} else if (lineNum == highlightPos + 1 || lineNum == highlightPos - 1) {
					ctx.globalAlpha = 0.75;
				} else {
					ctx.globalAlpha = 0.4;
				}
				var pos = positions[i];
				var from = pos.from;
				var to = pos.to;
				ctx.moveTo(from.x, from.y);
				ctx.lineTo(to.x, to.y);
				ctx.stroke();
			}
			if (highlightPos == lineCount) {
				highlightPos = 0;
			} else {
				highlightPos++;
			}
			this.highlightPos = highlightPos;

			if (isCSS3AnimationsSupported) {
				// CSS3Animationをサポートしている場合は、keyframesでスロバーを描写する
				canvas.className = CLASS_THROBBER_CANVAS;
			} else {
				var perMills = Math.floor(roundTime / lineCount);
				var that = this;

				// CSSAnimation未サポートの場合タイマーアニメーションで描画する
				// 対象ブラウザ: IE 9 / Firefox 2,3 / Opera  9.0～10.1 / Opera Mini 5.0～7.0 / Opera Mobile 10.0
				// http://caniuse.com/transforms2d
				// http://caniuse.com/#search=canvas
				this._runId = setTimeout(function() {
					that._run.call(that);
				}, perMills);
			}
		},
		setPercent: function(percent) {
			this.percentDiv.innerHTML = percent;
		}
	};

	/**
	 * インジケータ(メッセージ・画面ブロック・進捗表示)の表示や非表示を行うクラス。
	 * <p>
	 * このクラスは自分でnewすることはありません。<a href="h5.ui.html#indicator">h5.ui.indicator()</a>または、<a
	 * href="Controller.html#indicator">Controller.indicator()</a>の戻り値がIndicatorクラスです。
	 * </p>
	 *
	 * @class
	 * @name Indicator
	 * @see h5.ui.indicator
	 * @see Controller.indicator
	 */
	/**
	 * @private
	 * @param {String|Object} target インジケータを表示する対象のDOM要素、jQueryオブジェクトまたはセレクタ
	 * @param {Object} [option] オプション
	 * @param {Boolean} [showThrobber=true] スロバーを表示するかどうか。デフォルトは表示。
	 * @param {String} [option.message] 表示する文字列 (デフォルト:未指定)
	 * @param {Number} [option.percent] スロバーの中央に表示する数値。0～100で指定する (デフォルト:未指定)
	 * @param {Boolean} [option.block] 画面を操作できないようオーバーレイ表示するか (true:する/false:しない) (デフォルト:true)
	 * @param {Number} [option.fadeIn] インジケータをフェードで表示する場合、表示までの時間をミリ秒(ms)で指定する (デフォルト:フェードしない)
	 * @param {Number} [option.fadeOut] インジケータをフェードで非表示にする場合、非表示までの時間をミリ秒(ms)で指定する (デフォルト:しない)
	 * @param {Promise|Promise[]} [option.promises] Promiseオブジェクト (Promiseの状態に合わせて自動でインジケータの非表示を行う)
	 * @param {String} [option.theme] テーマクラス名 (インジケータのにスタイル定義の基点となるクラス名 (デフォルト:'a')
	 * @param {String} [option.throbber.lines] スロバーの線の本数 (デフォルト:12)
	 * @param {String} [option.throbber.roundTime] スロバーの白線が1周するまでの時間(ms)
	 *            (このオプションはCSS3Animationを未サポートブラウザのみ有効) (デフォルト:1000)
	 */
	function Indicator(target, option) {
		var that = this;
		var $t = $(target);
		// ターゲットが存在しない場合は何もしない
		if (!$t.length) {
			return;
		}
		// スクリーンロックで表示するか判定
		// (自分のwindowのみで、ポップアップウィンドウの場合はスクリーンロックと判定しない)
		var isScreenlock = isScreenlockTarget($t);
		// スクリーンロックで表示する場合はターゲットはbodyにする
		$t = isScreenlock ? $('body') : $t;
		// documentの取得
		var doc = getDocumentOf($t[0]);

		// 別ウィンドウのwindow又はdocumentが指定されていた場合は、そのwindow,documentのbodyに出す
		if (doc !== window.document && ($t[0] === doc || getWindowOfDocument(doc) === $t[0])) {
			$t = $(doc.body);
		}

		// デフォルトオプション
		var defaultOption = {
			message: '',
			percent: -1,
			block: true,
			fadeIn: -1,
			fadeOut: -1,
			promises: null,
			theme: 'a',
			showThrobber: true
		};
		// スロバーのスタイル定義 (基本的にはCSSで記述する。ただし固定値はここで設定する)
		// CSSAnimationsがサポートされているブラウザの場合、CSSのanimation-durationを使用するためroundTimeプロパティの値は使用しない
		var defaultStyle = {
			throbber: {
				roundTime: 1000,
				lines: 12
			},
			throbberLine: {},
			percent: {}
		};
		// デフォルトオプションとユーザオプションをマージしたオプション情報
		var settings = $.extend(true, {}, defaultOption, option);

		// インジケータを画面に表示したか
		this._displayed = false;
		// スロバーを保持する配列
		this._throbbers = [];
		// オプション情報
		this._settings = settings;
		// スタイル情報
		this._styles = $.extend(true, {}, defaultStyle, readThrobberStyle(settings.theme));
		if (settings.throbber) {
			$.extend(this._styles.throbber, settings.throbber);
		}
		// スクリーンロックで表示するか
		this._isScreenLock = isScreenlock;
		// 表示対象であるDOM要素を保持するjQueryオブジェクト
		this._$target = $t;
		// 表示対象のDOM要素 (旧バージョン互換用)
		this._target = this._$target.length === 1 ? this._$target[0] : this._$target.toArray();
		// scroll/touchmoveイベントハンドラで使用するタイマーID
		this._scrollEventTimerId = null;
		// scroll/touchmoveイベントハンドラ
		this._scrollHandler = function() {
			that._handleScrollEvent();
		};
		// resize/orientationchangeイベントハンドラ内で使用するタイマーID
		this._resizeEventTimerId = null;
		// scroll/touchmoveイベントハンドラ
		this._resizeHandler = function() {
			that._handleResizeEvent();
		};
		// DOM要素の書き換え可能かを判定するフラグ
		this._redrawable = true;
		// _redrawable=false時、percent()に渡された最新の値
		this._lastPercent = -1;
		// _redrawable=false時、message()に渡された最新の値
		this._lastMessage = null;
		// フェードインの時間 (フェードインで表示しない場合は-1)
		this._fadeInTime = typeof settings.fadeIn === 'number' ? settings.fadeIn : -1;
		// フェードアウトの時間 (フェードアウトで表示しない場合は-1)
		this._fadeOutTime = typeof settings.fadeOut === 'number' ? settings.fadeOut : -1;
		// コンテンツ(メッセージ/スロバー)
		this._$content = $();
		// オーバーレイ
		this._$overlay = $();
		// スキン - IE6の場合selectタグがz-indexを無視するため、オーバーレイと同一階層にiframe要素を生成してselectタグを操作出来ないようにする
		// http://www.programming-magic.com/20071107222415/
		this._$skin = $();
		// showが呼ばれた時にcontentを表示するかどうか。messageもスロバーもないなら表示しない
		this._showContent = settings.showThrobber || settings.message;

		// コンテンツ内の要素
		var contentElem = h5.u.str.format(FORMAT_THROBBER_MESSAGE_AREA,
				(settings.message === '') ? 'style="display: none;"' : '', settings.message);
		// httpsでiframeを開くと警告が出るためsrcに指定する値を変える
		// http://www.ninxit.com/blog/2008/04/07/ie6-https-iframe/
		var srcVal = 'https' === document.location.protocol ? 'return:false' : 'about:blank';

		for (var i = 0, len = this._$target.length; i < len; i++) {
			this._$content = this._$content.add($(doc.createElement('div')).append(contentElem)
					.addClass(CLASS_INDICATOR_ROOT).addClass(settings.theme).addClass(
							CLASS_INDICATOR_CONTENT).css('display', 'none'));
			this._$overlay = this._$overlay
					.add((settings.block ? $(doc.createElement('div')) : $()).addClass(
							CLASS_INDICATOR_ROOT).addClass(settings.theme).addClass(CLASS_OVERLAY)
							.css('display', 'none'));
			this._$skin = this._$skin.add(((isLegacyIE || compatMode) ? $(doc
					.createElement('iframe')) : $()).attr('src', srcVal).addClass(
					CLASS_INDICATOR_ROOT).addClass(CLASS_SKIN).css('display', 'none'));
		}

		var position = this._isScreenLock && usePositionFixed ? 'fixed' : 'absolute';
		// オーバーレイ・コンテンツにpositionを設定する
		$.each([this._$overlay, this._$content], function() {
			this.css('position', position);
		});

		var promises = settings.promises;
		var promiseCallback = function() {
			that.hide();
		};

		// jQuery1.7以下ならpipe、1.8以降ならthenを使ってコールバックを登録
		var pipeMethod = $.hasOwnProperty('curCSS') ? 'pipe' : 'then';
		if (isArray(promises)) {
			// プロミスでないものを除去
			promises = $.map(promises, function(item, idx) {
				return item && isFunction(item.promise) ? item : null;
			});

			if (promises.length > 0) {
				// whenを呼んで、pipeにコールバックを登録。
				// CFHの発火を阻害しないようにSilentlyでpipeコールバックを登録する。
				registerCallbacksSilently(h5.async.when(promises), pipeMethod, [promiseCallback,
						promiseCallback]);
			}
		} else if (promises && isFunction(promises.promise)) {
			// CFHの発火を阻害しないようにpipeを呼び出し。
			registerCallbacksSilently(promises, pipeMethod, [promiseCallback, promiseCallback]);
		}
	}

	Indicator.prototype = {
		/**
		 * 画面上にインジケータ(メッセージ・画面ブロック・進捗表示)を表示します。
		 *
		 * @memberOf Indicator
		 * @function
		 * @returns {Indicator} インジケータオブジェクト
		 */
		show: function() {
			if (this._displayed || !this._$target
					|| this._$target.children('.' + CLASS_INDICATOR_ROOT).length > 0) {
				return this;
			}

			this._displayed = true;

			var that = this;
			var fadeInTime = this._fadeInTime;
			var cb = function() {
				var $window = $(window);

				if (that._isScreenLock) {
					disableEventOnIndicator(that._$overlay, that._$content);

					if (!usePositionFixed) {
						$window.bind('touchmove', that._scrollHandler);
						$window.bind('scroll', that._scrollHandler);
					}
				}

				// 画面の向きの変更を検知したらインジータを中央に表示させる
				$window.bind('orientationchange', that._resizeHandler);
				$window.bind('resize', that._resizeHandler);
			};

			for (var i = 0, len = this._$target.length; i < len; i++) {
				var _$target = this._$target.eq(i);
				var _$content = this._$content.eq(i);
				var _$skin = this._$skin.eq(i);
				var _$overlay = this._$overlay.eq(i);
				var settings = this._settings;

				// position:absoluteの子要素を親要素からの相対位置で表示するため、親要素がposition:staticの場合はrelativeに変更する(親要素がbody(スクリーンロック)の場合は変更しない)
				// また、IEのレイアウトバグを回避するためzoom:1を設定する
				var targetPosition = getComputedStyleValue(_$target[0], 'position');
				if (!this._isScreenLock && targetPosition === 'static') {
					// スロバーメッセージ要素に親要素のposition/zoomを記憶させておく
					_$target.data(DATA_KEY_POSITION, targetPosition);
					_$target.data(DATA_KEY_ZOOM, getComputedStyleValue(_$target[0], 'zoom'));

					_$target.css({
						position: 'relative',
						zoom: '1'
					});
				}
				var doc = getDocumentOf(_$target[0]);
				var throbber = null;
				if (settings.showThrobber) {
					throbber = isCanvasSupported ? new ThrobberCanvas(this._styles, doc)
							: isVMLSupported ? new ThrobberVML(this._styles, doc) : null;
				}

				if (throbber) {
					that._throbbers.push(throbber);
					that.percent(this._settings.percent);
					throbber.show(_$content.children('.' + CLASS_INDICATOR_THROBBER)[0]);
				}
				_$target.append(_$skin).append(_$overlay);
				if (this._showContent) {
					// _$contentはメッセージまたはスロバーがある場合のみ
					_$target.append(_$content);
				}
			}

			// Array.prototype.pushを使って、適用する要素を配列にまとめる
			var elems = this._$skin.toArray();
			Array.prototype.push.apply(elems, this._$content.toArray());
			Array.prototype.push.apply(elems, this._$overlay.toArray());
			var $elems = $(elems);

			if (fadeInTime < 0) {
				$elems.css('display', 'block');
				cb();
			} else {
				fadeIn($elems, fadeInTime, cb);
			}

			this._reposition();
			this._resizeOverlay();
			return this;
		},
		/**
		 * オーバーレイのサイズを再計算します。
		 * <p>
		 * position:fixedで表示している場合は再計算しません。また、オーバレイ非表示の場合は何もしません。
		 * <p>
		 * position:absoluteの場合は高さのみ再計算を行い、IE6以下の標準モード及びQuirksモードの場合は高さと幅の両方を再計算します。
		 *
		 * @memberOf Indicator
		 * @function
		 * @private
		 */
		_resizeOverlay: function() {
			// スクリーンロックでpoisition:fixedが使用可能なブラウザの場合は、オーバレイをposition:fixedで表示している
			// オーバレイをposition:fixedで表示している場合は何もしない
			// また、オーバレイを表示していない(block:false)インジケータなら何もしない
			if ((this._isScreenLock && usePositionFixed) || this._$overlay.length === 0) {
				return;
			}

			for (var i = 0, len = this._$target.length; i < len; i++) {
				var _$content = this._$content.eq(i);
				var _$overlay = this._$overlay.eq(i);
				var _$target = this._$target.eq(i);
				var _$skin = this._$skin.eq(i);

				var w, h;

				//オーバーレイはターゲット要素全体の大きさ(スクロールサイズ)にする
				if (this._isScreenLock) {
					w = documentWidth();
					h = documentHeight();
				} else {
					// オーバレイとコンテンツを非表示にしたときのscrollWidth/Heightを取得する
					_$overlay.css('display', 'none');
					_$content.css('display', 'none');
					var scrSize = getScrollSize(_$target[0]);
					_$overlay.css('display', 'block');
					_$content.css('display', 'block');
					w = scrSize.w;
					h = scrSize.h;
				}
				_$overlay[0].style.width = w + 'px';
				_$overlay[0].style.height = h + 'px';

				if (isLegacyIE || compatMode) {
					_$skin[0].style.width = w + 'px';
					_$skin[0].style.height = h + 'px';
				}
			}
		},
		/**
		 * インジケータのメッセージ要素のwidthを調整し、中央になるようtopとleftの位置を設定します。
		 *
		 * @memberOf Indicator
		 * @function
		 * @private
		 */
		_reposition: function() {
			for (var i = 0, len = this._$target.length; i < len; i++) {
				var _$target = this._$target.eq(i);
				var _$content = this._$content.eq(i);

				if (this._isScreenLock) {
					// MobileSafari(iOS4)だと $(window).height()≠window.innerHeightなので、window.innerHeightをから高さを取得する
					// また、quirksモードでjQuery1.8.xの$(window).height()を実行すると0を返すので、clientHeightから高さを取得する
					var wh = windowHeight();

					if (usePositionFixed) {
						// 可視領域からtopを計算する
						_$content.css('top', ((wh - getOuterHeight(_$content[0])) / 2) + 'px');
					} else {
						// 可視領域+スクロール領域からtopを計算する
						_$content.css('top',
								((scrollTop() + (wh / 2)) - (getOuterHeight(_$content[0]) / 2))
										+ 'px');
					}
				} else {
					//オーバーレイの計算はスクロールサイズを基準にしている。これに倣い、中央揃え計算の基準はinnerHeight()にする(＝paddingを含める)。leftも同様
					_$content.css('top', _$target.scrollTop()
							+ (getInnerHeight(_$target[0]) - getOuterHeight(_$content[0])) / 2);
				}

				var blockElementPadding = getInnerWidth(_$content[0]) - getWidth(_$content[0]);

				var totalWidth = 0;

				_$content.children().each(function() {
					var $e = $(this);
					// IE9にて不可視要素に対してouterWidth(true)を実行すると不正な値が返ってくるため、display:noneの場合は値を取得しない
					if (getComputedStyleValue($e[0], 'display') === 'none') {
						return true;
					}
					totalWidth += getOuterWidth(this, true);
				});
				_$content.css('width', totalWidth + blockElementPadding);
				_$content.css('left', _$target.scrollLeft()
						+ (getInnerWidth(_$target[0]) - getOuterWidth(_$content[0])) / 2);
			}
		},
		/**
		 * 画面上に表示されているインジケータ(メッセージ・画面ブロック・進捗表示)を除去します。
		 *
		 * @memberOf Indicator
		 * @function
		 * @returns {Indicator} インジケータオブジェクト
		 */
		hide: function() {
			if (!this._displayed) {
				return this;
			}

			this._displayed = false;

			var that = this;
			var fadeOutTime = this._fadeOutTime;
			// Array.prototype.pushを使って、適用する要素を配列にまとめる
			var elems = this._$skin.toArray();
			Array.prototype.push.apply(elems, this._$content.toArray());
			Array.prototype.push.apply(elems, this._$overlay.toArray());
			var $elems = $(elems);
			var cb = function() {
				var $window = $(window);

				$elems.remove();
				// 親要素のposition/zoomをインジケータ表示前の状態に戻す
				if (!that._isScreenLock) {
					that._$target.each(function(i, e) {
						var $e = $(e);

						$e.css({
							position: $e.data(DATA_KEY_POSITION),
							zoom: $e.data(DATA_KEY_ZOOM)
						});

						$e.removeData(DATA_KEY_POSITION).removeData(DATA_KEY_ZOOM);
					});
				}

				$window.unbind('touchmove', that._scrollHandler);
				$window.unbind('scroll', that._scrollHandler);
				$window.unbind('orientationchange', that._resizeHandler);
				$window.unbind('resize', that._resizeHandler);

				if (that._resizeEventTimerId) {
					clearTimeout(that._resizeEventTimerId);
				}
				if (that._scrollEventTimerId) {
					clearTimeout(that._scrollEventTimerId);
				}
			};

			for (var i = 0, len = this._throbbers.length; i < len; i++) {
				this._throbbers[i].hide();
			}

			if (fadeOutTime < 0) {
				$elems.css('display', 'none');
				cb();
			} else {
				fadeOut($elems, fadeOutTime, cb);
			}

			return this;
		},
		/**
		 * 進捗のパーセント値を指定された値に更新します。
		 *
		 * @memberOf Indicator
		 * @function
		 * @param {Number} percent 進捗率(0～100%)
		 * @returns {Indicator} インジケータオブジェクト
		 */
		percent: function(percent) {
			if (typeof percent !== 'number' || !(percent >= 0 && percent <= 100)) {
				return this;
			}

			if (!this._redrawable) {
				this._lastPercent = percent;
				return this;
			}

			for (var i = 0, len = this._throbbers.length; i < len; i++) {
				this._throbbers[i].setPercent(percent);
			}

			return this;
		},
		/**
		 * メッセージを指定された値に更新します。
		 *
		 * @memberOf Indicator
		 * @function
		 * @param {String} message メッセージ
		 * @returns {Indicator} インジケータオブジェクト
		 */
		message: function(message) {
			if (!isString(message)) {
				return this;
			}

			if (!this._redrawable) {
				this._lastMessage = message;
				return this;
			}

			// スロバーが無くてメッセージが空文字ならcontentは表示しない
			this._showContent = this._settings.showThrobber || !!message;
			if (!this._showContent) {
				this._$content.remove();
			} else {
				this._$target.append(this._$content);
			}
			this._$content.children('.' + CLASS_INDICATOR_MESSAGE).css('display', 'inline-block')
					.text(message);
			this._reposition();

			return this;
		},
		/**
		 * scroll/touchmoveイベントハンドラ
		 * <p>
		 * タッチまたはホイールスクロールの停止を検知します
		 */
		_handleScrollEvent: function() {
			if (this._scrollEventTimerId) {
				clearTimeout(this._scrollEventTimerId);
			}

			if (!this._redrawable) {
				return;
			}

			var that = this;
			this._scrollEventTimerId = setTimeout(function() {
				that._reposition();
				that._scrollEventTimerId = null;
			}, 50);
		},
		/**
		 * orientationChange/resizeイベントハンドラ
		 * <p>
		 * orientationChange/resizeイベントが発生した1秒後に、インジケータとオーバーレイを画面サイズに合わせて再描画し、 メッセージとパーセントの内容を更新する。
		 *
		 * @memberOf Indicator
		 * @function
		 * @private
		 */
		_handleResizeEvent: function() {
			var that = this;

			function updateMessageArea() {
				that._resizeOverlay();
				that._reposition();
				that._redrawable = true;
				that.percent(that._lastPercent);
				that.message(that._lastMessage);
				that._resizeEventTimerId = null;
			}

			if (this._resizeEventTimerId) {
				clearTimeout(this._resizeEventTimerId);
			}

			this._redrawable = false;

			if (usePositionFixed || isLegacyIE || compatMode) {
				updateMessageArea();
			} else {
				// Android 4.xの場合、orientationChangeイベント発生直後にDOM要素の書き換えを行うと画面の再描画が起こらなくなることがあるため、対症療法的に対処
				this._resizeEventTimerId = setTimeout(function() {
					updateMessageArea();
				}, 1000);
			}
		}
	};

	/**
	 * 指定された要素に対して、インジケータ(メッセージ・画面ブロック・進捗)の表示や非表示を行うためのオブジェクトを取得します。
	 * <p>
	 * 第1引数にインジケータの設定を記述したパラメータオブジェクトを指定してください。
	 * <p>
	 * <strong>第1引数にインジケータのターゲットを指定する方法は非推奨です。</strong>
	 * </p>
	 *
	 * <pre><code>
	 * h5.ui.indicator({
	 * 	target: 'body'
	 * });
	 *
	 * // h5.ui.indicator('body'); 非推奨
	 * </code></pre>
	 *
	 * targetに<strong>document</strong>、<strong>window</strong>または<strong>body</strong>を指定しかつ、blockオプションがtrueの場合、「スクリーンロック」として動作します。<br>
	 * 上記以外のDOM要素を指定した場合は、指定した要素上にインジケータを表示します。
	 * <p>
	 * <strong>スクリーンロック</strong>とは、コンテンツ領域(スクロールしないと見えない領域も全て含めた領域)全体にオーバーレイを、表示領域(画面に見えている領域)中央にメッセージが表示し、画面を操作できないようにすることです。スマートフォン等タッチ操作に対応する端末の場合、スクロール操作も禁止します。
	 * <h4>スクリーンロック中の制限事項</h4>
	 * <ul>
	 * <li>Android
	 * 4.xにてorientationchangeイベント発生直後にインジケータのDOM要素の書き換えを行うと画面の再描画が起こらなくなってしまうため、orientationchangeイベント発生から1秒間percent()/massage()での画面の書き換えをブロックします。<br>
	 * orientationchagenイベント発生から1秒以内にpercent()/message()で値を設定した場合、最後に設定された値が画面に反映されます。</li>
	 * <li>WindowsPhone
	 * 7ではscrollイベントを抑止できないため、インジケータ背後の要素がスクロールしてしまいます。ただし、クリック等その他のイベントはキャンセルされます。</li>
	 * </ul>
	 * <h4>使用例</h4>
	 * <strong>スクリーンロックとして表示する</strong><br>
	 *
	 * <pre>
	 * var indicator = h5.ui.indicator({
	 * 	target: document
	 * }).show();
	 * </pre>
	 *
	 * <strong>li要素にスロバー(くるくる回るアイコン)を表示してブロックを表示しない場合</strong><br>
	 *
	 * <pre>
	 * var indicator = h5.ui.indicator({
	 * 	target: 'li',
	 * 	block: false
	 * }).show();
	 * </pre>
	 *
	 * <strong>パラメータにPromiseオブジェクトを指定して、done()/fail()の実行と同時にインジケータを除去する</strong><br>
	 * resolve() または reject() が実行されると、画面からインジケータを除去します。
	 *
	 * <pre>
	 * var df = $.Deferred();
	 * var indicator = h5.ui.indicator({
	 * 	target: document,
	 * 	promises: df.promise()
	 * }).show();
	 *
	 * setTimeout(function() {
	 * 	df.resolve(); // ここでインジケータが除去される
	 * }, 2000);
	 * </pre>
	 *
	 * <strong>パラメータに複数のPromiseオブジェクトを指定して、done()/fail()の実行と同時にインジケータを除去する</strong><br>
	 * Promiseオブジェクトを複数指定すると、全てのPromiseオブジェクトでresolve()が実行されるか、またはいずれかのPromiseオブジェクトでfail()が実行されるタイミングでインジケータを画面から除去します。
	 *
	 * <pre>
	 * var df = $.Deferred();
	 * var df2 = $.Deferred();
	 * var indicator = h5.ui.indicator({
	 * 	target: document,
	 * 	promises: [df.promise(), df2.promise()]
	 * }).show();
	 *
	 * setTimeout(function() {
	 * 	df.resolve();
	 * }, 2000);
	 *
	 * setTimeout(function() {
	 * 	df.resolve(); // ここでインジケータが除去される
	 * }, 4000);
	 * </pre>
	 *
	 * <p>
	 * コントローラのindicator()の仕様については、<a href="./Controller.html#indicator">Controller.indicator</a>のドキュメント
	 * を参照下さい。
	 *
	 * @memberOf h5.ui
	 * @name indicator
	 * @function
	 * @param {Object} param パラメータオブジェクト
	 * @param {DOM|jQuery|String} param.target インジケータを表示する対象のDOM要素、jQueryオブジェクトまたはセレクタ
	 * @param {String} [param.message] スロバーの右側に表示する文字列 (デフォルト:未指定)
	 * @param {Number} [param.percent] スロバーの中央に表示する数値。0～100で指定する (デフォルト:未指定)
	 * @param {Boolean} [param.block] 画面を操作できないようオーバーレイ表示するか (true:する/false:しない) (デフォルト:true)
	 * @param {Number} [param.fadeIn] インジケータをフェードで表示する場合、表示までの時間をミリ秒(ms)で指定する (デフォルト:フェードしない)
	 * @param {Number} [param.fadeOut] インジケータをフェードで非表示にする場合、非表示までの時間をミリ秒(ms)で指定する (デフォルト:しない)
	 * @param {Promise|Promise[]} [param.promises] Promiseオブジェクト (Promiseの状態に合わせて自動でインジケータの非表示を行う)
	 * @param {String} [param.theme] テーマクラス名 (インジケータのにスタイル定義の基点となるクラス名 (デフォルト:'a')
	 * @param {String} [param.throbber.lines] スロバーの線の本数 (デフォルト:12)
	 * @param {String} [param.throbber.roundTime] スロバーの白線が1周するまでの時間(ms)
	 *            (このオプションはCSS3Animationを未サポートブラウザのみ有効) (デフォルト:1000)
	 * @param {Object} [option] 第1引数にターゲット(param.target)を指定して、第2引数にオプションオブジェクトを指定できます。<strong>ただしこの指定方法は非推奨です。</strong><br>
	 *            第2引数のオプションオブジェクトの構造は、パラメータオブジェクトと同様です。
	 * @see Indicator
	 * @see Controller.indicator
	 */
	var indicator = function(param, option) {
		if ($.isPlainObject(param)) {
			// 第1引数にパラメータオブジェクトが渡されていた場合は、ターゲットをパラメータオブジェクトから取得
			// (第1引数がプレーンオブジェクトならパラメータ、そうでないならターゲットの指定と判定する)
			return new Indicator(param.target, param);
		}
		// 第1引数にターゲット、第2引数にオプションオブジェクト
		return new Indicator(param, option);
	};

	/**
	 * 要素が可視範囲内、または指定した親要素内にあるかどうかを返します。
	 * <p>
	 * 第2引数を省略した場合、要素がウィンドウ内に見えているかどうかを返します。 elementが他のDOM要素によって隠れていても、範囲内にあればtrueを返します。
	 * </p>
	 * <p>
	 * 第2引数を指定した場合、elementがcontainerの表示範囲内で見えているかどうかを返します。 containerがウィンドウ内に見えているかどうかは関係ありません。
	 * elementがcontainerの子孫要素で無ければundefinedを返します。
	 * </p>
	 * <p>
	 * ブラウザで拡大/縮小を行っていた場合、僅かな誤差のために結果が異なる場合があります。
	 * </p>
	 * <p>
	 * いずれの場合も、要素が非表示の場合の動作は保障されません。
	 * </p>
	 *
	 * @param {String|Element|jQuery} element 要素
	 * @param {Object} container コンテナ
	 * @returns {Boolean} 要素が可視範囲内にあるかどうか
	 * @name isInView
	 * @function
	 * @memberOf h5.ui
	 */
	var isInView = function(element, container) {
		var viewTop, viewBottom, viewLeft, viewRight;
		var $element = $(element);
		var height, width;

		// containerの位置を取得。borderの内側の位置で判定する。
		if (typeof container === TYPE_OF_UNDEFINED) {
			// containerが指定されていないときは、画面表示範囲内にあるかどうか判定する
			height = getDisplayArea('Height');
			width = getDisplayArea('Width');
			viewTop = scrollTop();
			viewLeft = scrollLeft();
		} else {
			var $container = $(container);
			if ($container.find($element).length === 0) {
				// elementとcontaienrが親子関係でなければundefinedを返す
				return undefined;
			}
			var containerOffset = getOffset($container);
			viewTop = containerOffset.top + parseInt($container.css('border-top-width'));
			viewLeft = containerOffset.left + parseInt($container.css('border-left-width'));
			height = $container.innerHeight();
			width = $container.innerWidth();
		}
		viewBottom = viewTop + height;
		viewRight = viewLeft + width;

		// elementの位置を取得。borderの外側の位置で判定する。
		var elementOffset = getOffset($element);
		var positionTop = elementOffset.top;
		var positionLeft = elementOffset.left;
		var positionBottom = positionTop + $element.outerHeight();
		var positionRight = positionLeft + $element.outerWidth();

		return ((viewTop <= positionTop && positionTop < viewBottom) || (viewTop < positionBottom && positionBottom <= viewBottom))
				&& ((viewLeft <= positionLeft && positionLeft < viewRight) || (viewLeft < positionRight && positionRight <= viewRight));
	};

	/**
	 * ブラウザのトップにスクロールします。
	 *
	 * @name scrollToTop
	 * @function
	 * @memberOf h5.ui
	 */
	var scrollToTop = function() {
		var waitCount = 3;

		function fnScroll() {
			if (window.scrollY === 1) {
				waitCount = 0;
			}
			if (waitCount > 0) {
				window.scrollTo(0, 1);
				waitCount--;
				setTimeout(fnScroll, WAIT_MILLIS);
			}
		}

		window.scrollTo(0, 1);
		if ($(window).scrollTop() !== 1) {
			setTimeout(fnScroll, WAIT_MILLIS);
		}
	};

	// =============================
	// Expose to window
	// =============================

	h5.u.obj.expose('h5.ui', {
		indicator: indicator,
		isInView: isInView,
		scrollToTop: scrollToTop
	});
})();
/* ------ h5.ui.jqm.manager ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	var EV_NAME_H5_JQM_PAGE_HIDE = 'h5jqmpagehide';
	var EV_NAME_H5_JQM_PAGE_SHOW = 'h5jqmpageshow';
	var EV_NAME_EMULATE_PAGE_SHOW = 'h5controllerready.emulatepageshow';

	// =============================
	// Production
	// =============================

	// エラーコード
	var ERR_CODE_INVALID_TYPE = 12000;
	var ERR_CODE_NAME_INVALID_PARAMETER = 12001;

	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.ui.jqm.manager');
	/* del begin */
	var FW_LOG_JQM_CONTROLLER_ALREADY_INITIALIZED = '既にJQMマネージャは初期化されています。';
	var FW_LOG_CONTROLLER_DEF_ALREADY_DEFINED = '既にコントローラ"{0}"はJQMマネージャに登録されています。';
	var FW_LOG_CSS_FILE_PATH_ALREADY_DEFINED = '既にCSSファイル"{0}"はJQMマネージャに登録されています。';

	// エラーコードマップ
	var errMsgMap = {};
	errMsgMap[ERR_CODE_INVALID_TYPE] = '引数{0}が不正です。正しい値を指定して下さい。';
	errMsgMap[ERR_CODE_NAME_INVALID_PARAMETER] = '引数の指定に誤りがあります。第2引数にCSSファイルパス、第3引数にコントローラ定義オブジェクトを指定して下さい。';
	addFwErrorCodeMap(errMsgMap);
	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	/**
	 * ページをの初期化処理呼び出しをpagecreateイベントハンドラで行うかどうか
	 * <p>
	 * このフラグがtrueの場合はpagecreateイベントハンドラでページの初期化処理を呼び出します。
	 * falseの場合はpageinitイベントハンドラでページの初期化処理を呼び出します。
	 * </p>
	 * <p>
	 * jqm1.4より前ではpagecreateイベントはページのDOM拡張前、pageinitイベントはページのDOM拡張後に上がりますが、
	 * jqm1.4以降ではDOM拡張後にpagecreateが上がり、pageinitイベントはdeprecatedになりました。
	 * jqm1.4以降ではdeprecatedなpageinitではなくpagecreateイベントハンドラで初期化処理を行うようにします。
	 * </p>
	 * <p>
	 * フラグの値はh5.ui.jqm.manager.init時に設定します。
	 * </p>
	 */
	var shouldHandlePagecreateEvent;

	/**
	 * JQMControllerのインスタンス(シングルトン)
	 */
	var jqmControllerInstance = null;

	/**
	 * コントローラのマップ
	 * <p>
	 * キー：ページID、値：コントローラ定義オブジェクト
	 *
	 * @type Object
	 */
	var controllerMap = {};

	/**
	 * コントローラインスタンスのマップ
	 * <p>
	 * キー：ページID、値：コントローラインスタンスの配列
	 *
	 * @type Object
	 */
	var controllerInstanceMap = {};

	/**
	 * JQMManagerで管理する、h5.core.controller()で動的に生成されたコントローラインスタンスを保持するマップ
	 * <p>
	 * キー：ページID、値：コントローラインスタンスの配列
	 *
	 * @type Object
	 */
	var dynamicControllerInstanceMap = {};

	/**
	 * 初期化パラメータのマップ
	 * <p>
	 * キー：ページID、値：初期化パラメータの配列
	 *
	 * @type Object
	 */
	var initParamMap = {};

	/**
	 * CSSファイルのマップ
	 * <p>
	 * キー：ページID、値：CSSファイルパスのオブジェクトの配列
	 *
	 * @type Object
	 */
	var cssMap = {};

	/**
	 * h5.ui.jqm.manager.init()が呼ばれたかどうかを示すフラグ
	 *
	 * @type Boolean
	 */
	var isInitCalled = false;

	/**
	 * pagehideイベントが発生したかを判定するフラグ
	 *
	 * @type Boolean
	 */
	var hideEventFired = false;

	/**
	 * 初期表示時、アクティブページにバインドしたコントローラがreadyになるよりも前に、 pageshowが発火したかを判定するフラグ
	 *
	 * @type Boolean
	 */
	var showEventFiredBeforeReady = false;

	// =============================
	// Functions
	// =============================

	/**
	 * アクティブページに設定されているID属性の値を取得します。
	 * <p>
	 * アクティブページが存在しない、またはIDが1文字以上の文字列ではない場合nullを取得します。
	 */
	function getActivePageId() {
		var $ap = $.mobile.activePage;
		var id = $ap && $ap[0] && $ap[0].id;
		return isString(id) && id.length > 0 ? id : null;
	}

	/**
	 * 現在のアクティブページにコントローラをバインドします。
	 */
	function bindToActivePage() {
		var id = getActivePageId();

		if (id === null) {
			return;
		}
		// jqmControllerInstanceにインスタンスが格納されるのはinitの中で$(function(){})で囲って行っているため、
		// bindToActivePageがdocument.readyより前に呼ばれた場合はjqmControllerInstanceに値がまだ入っていない場合がある。
		// そのためjqmControllerInstanceのメソッド呼び出しは$(function(){})で囲って行っている。
		$(function() {
			jqmControllerInstance.addCSS(id);
			jqmControllerInstance.bindController(id);
		});
	}

	/**
	 * コントローラインスタンスの__nameプロパティとコントローラ定義オブジェクトの__nameプロパティを比較し、同値であるかを判定します。
	 *
	 * @param {Object[]} controllerInstances コントローラインスタンスを保持する配列
	 * @param {Object} controllerDefObj コントローラ定義オブジェクト
	 */
	function equalsControllerName(controllerInstances, controllerDefObj) {
		var ret = false;

		for (var i = 0, len = controllerInstances.length; i < len; i++) {
			var ci = controllerInstances[i];
			if (ci && ci.__name === controllerDefObj.__name) {
				ret = true;
				break;
			}
		}

		return ret;
	}

	/**
	 * JQMマネージャが管理する動的または静的コントローラが持つイベントハンドラの有効・無効化を行います
	 *
	 * @param {String} id ページID
	 * @param {Boolean} flag (true: ハンドラを有効化する / false: ハンドラを無効化する)
	 */
	function changeListenerState(id, flag) {
		for (var prop in controllerInstanceMap) {
			var controllers = controllerInstanceMap[prop];
			var pageControllerEnabled = id === prop;

			for (var i = 0, len = controllers.length; i < len; i++) {
				var controller = controllers[i];

				if (pageControllerEnabled) {
					controller[(flag ? 'enable' : 'disable') + 'Listeners']();
				}
			}
		}

		for (var prop in dynamicControllerInstanceMap) {
			var dynamicControllers = dynamicControllerInstanceMap[prop];
			var dynamicControllerEnabled = id === prop;

			for (var i = 0, len = dynamicControllers.length; i < len; i++) {
				var dynamicController = dynamicControllers[i];

				if (dynamicControllerEnabled) {
					dynamicController[(flag ? 'enable' : 'disable') + 'Listeners']();
				}
			}
		}
	}

	/**
	 * バージョン文字列の大小を比較する関数
	 * <p>
	 * '1.11.0', '1.9.9'のような'.'区切りのバージョン文字列を比較して、第1引数の方が小さければ-1、同じなら0、第2引数の方が小さければ1 を返す。
	 * </p>
	 *
	 * @param {String} a バージョン文字列
	 * @param {String} b バージョン文字列
	 * @returns {Integer} 比較結果。aがbより小さいなら-1、同じなら0、aがbより大きいなら1 を返す
	 */
	function compareVersion(a, b) {
		// '.0'が末尾にならない様にする
		a = a.replace(/(\.0+)+$/, '');
		b = b.replace(/(\.0+)+$/, '');

		if (a === b) {
			// aとbが同じならループで比較せずに0を返す
			return 0;
		}
		var aAry = a.split('.');
		var bAry = b.split('.');

		var aAryLen = aAry.length;
		for (var i = 0; i < aAryLen; i++) {
			if (bAry[i] == null) {
				// bAryが先にnullになった=aAryの方が桁数(バージョン文字列の.の数)が多い場合、
				// '.0'が末尾にならないようにしてあるので、桁数の多い方がバージョンが大きい
				return 1;
			}
			var aVal = parseInt(aAry[i], 10);
			var bVal = parseInt(bAry[i], 10);
			if (aVal === bVal) {
				// 同じなら次以降のindexで比較
				continue;
			}
			// 比較してaが小さいなら-1、bが小さいなら-1を返す
			return aVal < bVal ? -1 : 1;
		}
		if (bAry[aAryLen] != null) {
			// aAryよりbAryの方が桁数が多い場合はbの方が桁数が多いのでバージョンが大きい
			return -1;
		}
		// 最後まで比較して同じなら同じバージョンなので0を返す
		return 0;
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/**
	 * @name jqm
	 * @memberOf h5.ui
	 * @namespace
	 */
	h5.u.obj.ns('h5.ui.jqm');

	/**
	 * hifiveで使用するdata属性のプレフィックス。<br />
	 * デフォルトは"h5"。
	 *
	 * @type String
	 * @memberOf h5.ui.jqm
	 * @name dataPrefix
	 */
	h5.ui.jqm.dataPrefix = 'h5';

	/**
	 * JQMコントローラ
	 */
	var jqmController = {
		/**
		 * コントローラ名
		 *
		 * @memberOf JQMController
		 */
		__name: 'JQMController',
		/**
		 * __readyイベントのハンドラ
		 *
		 * @param {Object} context コンテキスト
		 * @memberOf JQMController
		 */
		__ready: function() {
			var that = this;
			var activePageId = getActivePageId();

			$(':jqmData(role="page"), :jqmData(role="dialog")').each(function() {
				that.loadScript(this.id);
			});

			var $page = this.$find('#' + activePageId);

			// 初期表示時、トランジションにアニメーションが適用されていない場合、
			// JQMコントローラがreadyになる前にpageshowが発火してしまいJQMコントローラが拾うことができないため、
			// 既にpageshowが発火されていたら、h5controllerreadyのタイミングで、h5jqmpageshowをトリガする
			$page.one(EV_NAME_EMULATE_PAGE_SHOW, function() {
				if (showEventFiredBeforeReady && $page[0] === $.mobile.activePage[0]) {
					$page.trigger(EV_NAME_H5_JQM_PAGE_SHOW, {
						prevPage: $('')
					});
				}
			});
		},
		/**
		 * pageinitイベントのハンドラ
		 *
		 * @param {Object} context コンテキスト
		 * @memberOf JQMController
		 */
		':jqmData(role="page"), :jqmData(role="dialog") pageinit': function(context) {
			// pagecreateイベントを使うべきである場合はpagecreateハンドラ、そうでない時はpageinitハンドラで初期化処理を行う。
			if (!shouldHandlePagecreateEvent) {
				this._initPage(context.event.target.id);
			}
		},

		/**
		 * pagecreateイベントのハンドラ
		 *
		 * @param {Object} context コンテキスト
		 * @memberOf JQMController
		 */
		':jqmData(role="page"), :jqmData(role="dialog") pagecreate': function(context) {
			if (shouldHandlePagecreateEvent) {
				this._initPage(context.event.target.id);
			}
		},

		/**
		 * ページの初期化処理を行う
		 *
		 * @private
		 * @param {String} id
		 * @memberOf JQMController
		 */
		_initPage: function(id) {
			this.loadScript(id);
			this.addCSS(id);
			this.bindController(id);
		},

		/**
		 * pageremoveイベントのハンドラ
		 *
		 * @param {Object} context コンテキスト
		 * @memberOf JQMController
		 */
		'{rootElement} pageremove': function(context) {
			// pagehide -> pageremoveの順でイベントは発火するので、pagehideのタイミングでh5jqmpagehideをトリガすればよいが、
			// 別ページに遷移する際、JQMがpagebeforeloadからpageloadの間のタイミングで、pageremoveをトリガするハンドラをpagehide.removeにバインドしてしまう為、
			// これ以降にpagehideに対して登録したハンドラは全てpageremoveの後に発火してしまう
			// 上記の理由により、pageremoveが発生する場合は、このタイミングでh5jqmpagehideイベントをトリガし、
			// pagehideイベントではh5jqmpagehideイベントを発火しないようフラグで制御する
			$(context.event.target).trigger(EV_NAME_H5_JQM_PAGE_HIDE, {
				nextPage: $.mobile.activePage
			});
			hideEventFired = true;

			var id = context.event.target.id;
			var controllers = controllerInstanceMap[id];
			var dynamicControllers = dynamicControllerInstanceMap[id];

			if (controllers) {
				for (var i = 0, len = controllers.length; i < len; i++) {
					controllers[i].dispose();
				}

				controllerInstanceMap[id] = [];
			}

			if (dynamicControllers) {
				for (var i = 0, len = dynamicControllers.length; i < len; i++) {
					dynamicControllers[i].dispose();
				}

				dynamicControllerInstanceMap[id] = [];
			}
		},
		/**
		 * pagebeforeshowイベントのハンドラ
		 *
		 * @param {Object} context コンテキスト
		 * @memberOf JQMController
		 */
		'{rootElement} pagebeforeshow': function(context) {
			var id = context.event.target.id;

			this.addCSS(id);
			changeListenerState(id, true);
		},
		/**
		 * pagehideイベントのハンドラ コントローラでもページ非表示時のイベントを拾えるようにするため、
		 * JQMのpagehideイベントと同じタイミングで、JQMマネージャが管理しているコントローラのルート要素に対してh5jqmpagehideイベントをトリガします
		 * h5jqmpagehideイベントをトリガ後アクティブページ以外のページに対して、コントローラのイベントハンドラの無効化と、 CSSの定義をHEADタグから削除を行います
		 *
		 * @param {Object} context コンテキスト
		 * @memberOf JQMController
		 */
		'{rootElement} pagehide': function(context) {
			if (!hideEventFired) {
				$(context.event.target).trigger(EV_NAME_H5_JQM_PAGE_HIDE, {
					nextPage: context.evArg.nextPage
				});
			}

			hideEventFired = false;

			var id = context.event.target.id;

			changeListenerState(id, false);
			this.removeCSS(id);
		},
		/**
		 * コントローラでもページ表示時のイベントを拾えるようにするため、 JQMのpageshowイベントと同じタイミングで、JQMマネージャが管理しているコントローラのルート要素に対して
		 * h5jqmpageshowイベントをトリガします
		 *
		 * @param {Object} context コンテキスト
		 * @memberOf JQMController
		 */
		'{rootElement} pageshow': function(context) {
			var emulatePageShow = false;
			var $target = $(context.event.target);
			var $fromPage = context.evArg ? context.evArg.prevPage : $('');
			var conAr = controllerInstanceMap[$target[0].id];

			if (conAr) {
				for (var i = 0, len = conAr.length; i < len; i++) {
					var controllerInstance = conAr[i];
					// isReady=falseであるときコントローラのイベントハンドラは無効であり、
					// JQMマネージャが管理する静的コントローラがイベントを受け取れない状態なので、h5controllerready後にh5jqmpageshowをトリガするようにする
					// トランジションのアニメーションが無効(同期でJQMのイベントが発生する)場合のみここに到達する
					if (!controllerInstance.isReady) {
						$target.unbind(EV_NAME_EMULATE_PAGE_SHOW).one(EV_NAME_EMULATE_PAGE_SHOW,
								function() {
									if ($.mobile.activePage[0] === $target[0]) {
										$target.trigger(EV_NAME_H5_JQM_PAGE_SHOW, {
											prevPage: $fromPage
										});
									}
								});
						emulatePageShow = true;
						break;
					}
				}
			}

			if (!emulatePageShow) {
				$target.trigger(EV_NAME_H5_JQM_PAGE_SHOW, {
					prevPage: $fromPage
				});
			}
		},
		/**
		 * h5controllerboundイベントを監視しコントローラインスタンスを管理するためのイベントハンドラ
		 *
		 * @param {Object} context コンテキスト
		 * @memberOf JQMController
		 */
		'{rootElement} h5controllerbound': function(context) {
			var boundController = context.evArg;

			if (this === boundController) {
				return;
			}

			var id = getActivePageId();

			if (id === null) {
				return;
			}

			// define()でバインドしたコントローラも、h5controllerboundイベントを発火するので、
			// このイベントを発生させたコントローラが、define()によってバインドしたコントローラか判定する
			// ↑がtrue = 「既にJQMManagerの管理対象になっているコントローラ」なので、dynamicControllerInstanceMapに含めない
			if ($.inArray(boundController, controllerInstanceMap[id]) !== -1) {
				return;
			}

			if (!dynamicControllerInstanceMap[id]) {
				dynamicControllerInstanceMap[id] = [];
			}

			dynamicControllerInstanceMap[id].push(boundController);
		},
		/**
		 * 動的に生成されたコントローラがunbindまたはdisposeされた場合、JQMManagerの管理対象から除外します
		 *
		 * @param context コンテキスト
		 * @memberOf JQMController
		 */
		'{rootElement} h5controllerunbound': function(context) {
			var unboundController = context.evArg;
			var id = getActivePageId();

			if (id === null) {
				return;
			}

			var index = $.inArray(unboundController, dynamicControllerInstanceMap[id]);

			if (index === -1) {
				return;
			}

			dynamicControllerInstanceMap[id].splice(index, 1);
		},
		/**
		 * 指定されたページIDに紐付くスクリプトをロードする。
		 *
		 * @param {String} id ページID
		 * @memberOf JQMController
		 */
		loadScript: function(id) {
			var page = $('#' + id);
			var script = $.trim(page.data(this.getDataAttribute('script')));

			if (script.length === 0) {
				return;
			}

			var src = $.map(script.split(','), function(n) {
				return $.trim(n);
			});
			var async = page.data(this.getDataAttribute('async')) == true;

			return h5.u.loadScript(src, {
				async: async
			});
		},

		/**
		 * JQMコントローラが使用するdata属性にprefixを付けた属性名を返す。
		 *
		 * @param {String} attributeName 属性名
		 * @returns {String} prefixを付けた属性名
		 */
		getDataAttribute: function(attributeName) {
			var prefix = h5.ui.jqm.dataPrefix;
			if (prefix == null) {
				prefix = 'h5';
			}
			return prefix.length !== 0 ? prefix + '-' + attributeName : attributeName;
		},

		/**
		 * コントローラのバインドを行う
		 *
		 * @param {String} id ページID
		 * @memberOf JQMController
		 */
		bindController: function(id) {
			var controllerDefs = controllerMap[id];
			var initParams = initParamMap[id];

			if (!controllerDefs || controllerDefs.length === 0) {
				return;
			}

			if (!controllerInstanceMap[id]) {
				controllerInstanceMap[id] = [];
			}

			var ci = controllerInstanceMap[id];

			for (var i = 0, len = controllerDefs.length; i < len; i++) {
				var defObj = controllerDefs[i];

				if (equalsControllerName(ci, defObj)) {
					continue;
				}

				controllerInstanceMap[id].push(h5.core.controller('#' + id, defObj, initParams[i]));
			}
		},

		/**
		 * 指定されたページIDに紐付くCSSをHEADに追加する。
		 *
		 * @param {String} id ページID
		 * @memberOf JQMController
		 */
		addCSS: function(id) {
			var src = cssMap[id];

			if (!src) {
				return;
			}

			var head = document.getElementsByTagName('head')[0];
			var linkTags = head.getElementsByTagName('link');
			var linkLen = linkTags.length;

			for (var i = 0, srcLen = src.length; i < srcLen; i++) {
				var path = $.mobile.path.parseUrl(src[i]).filename;
				var isLoaded = false;

				for (var j = 0; j < linkLen; j++) {
					var loadedPath = $.mobile.path.parseUrl(linkTags[j].href).filename;

					if (loadedPath === path) {
						isLoaded = true;
						break;
					}
				}

				if (isLoaded) {
					continue;
				}

				var cssNode = document.createElement('link');
				cssNode.type = 'text/css';
				cssNode.rel = 'stylesheet';
				cssNode.href = src[i];
				head.appendChild(cssNode);
			}
		},

		/**
		 * 指定されたページIDに紐付くCSSを削除する。
		 *
		 * @param {String} id ページID
		 * @memberOf JQMController
		 */
		removeCSS: function(id) {
			var fromPageCSS = cssMap[id];

			if (!fromPageCSS) {
				return;
			}

			var id = getActivePageId();

			if (id === null) {
				return;
			}

			var toPageCSS = cssMap[id];

			$('link').filter(function() {
				var href = $(this).attr('href');
				// 遷移元のページで使用していたCSSファイルを、遷移先のページでも使用する場合はremoveしない
				return $.inArray(href, fromPageCSS) !== -1 && $.inArray(href, toPageCSS) === -1;
			}).remove();
		}
	};

	// =============================
	// Expose to window
	// =============================

	/**
	 * jQuery Mobile専用コントローラマネージャ (JQM Manager)
	 * <p>
	 * 現在表示されているページ(アクティブページ)に指定したコントローラとCSSファイルを読み込むという定義を行うことにより、 jQuery
	 * Mobile特有のページのライフサイクル(DOM生成や破棄)にあわせて、ページに対して
	 * <ul>
	 * <li>コントローラで定義したハンドラ</li>
	 * <li>スタイル(CSSファイル)</li>
	 * </ul>
	 * の有効・無効化を行います。
	 * <p>
	 * JQM Managerはページ内で動的に作成した(h5.core.controller()で生成した)コントローラも管理します。<br>
	 * 動的に生成したコントローラもページに紐づくものとして管理し、define()で生成したコントローラと同様に、ページの遷移によってハンドラとスタイルの有効・無効化を行います。
	 * <p>
	 * 動的に生成されたコントローラは、そのページに内で起こったユーザー操作などによって初めて作られるものと考えられるため、
	 * pageremoveイベントが発生してページが破棄されると、そのページに紐づいたコントローラのインスタンスも破棄されます。
	 *
	 * @name manager
	 * @memberOf h5.ui.jqm
	 * @namespace
	 */
	h5.u.obj.expose('h5.ui.jqm.manager',
			{
				/**
				 * jQuery Mobile用hifiveコントローラマネージャを初期化します。
				 * <p>
				 * 2回目以降は何も処理を行いません。
				 *
				 * @memberOf h5.ui.jqm.manager
				 * @function
				 * @name init
				 */
				init: function() {
					if (isInitCalled) {
						fwLogger.info(FW_LOG_JQM_CONTROLLER_ALREADY_INITIALIZED);
						return;
					}
					isInitCalled = true;

					// jqmのバージョンを見てpagecreateイベントのタイミングで初期化するべきかどうかのフラグの値をセットする
					// (initが呼ばれるタイミングではjqmが読み込まれている前提)
					shouldHandlePagecreateEvent = compareVersion($.mobile.version, '1.4') >= 0;

					// 初期表示時、JQMマネージャがreadyになる前にpageshowイベントが発火したかをチェックする
					$(document).one('pageshow', function() {
						showEventFiredBeforeReady = true;
					});

					$(function() {
						jqmControllerInstance = h5internal.core.controllerInternal('body',
								jqmController, null, {
									managed: false
								});
						bindToActivePage();
					});
				},

				/**
				 * jQuery Mobile用hifiveコントローラマネージャにコントローラを登録します。
				 * <p>
				 * 「data-role="page"」または「data-role="dialog"」の属性が指定された要素でかつ、
				 * idが第1引数で指定されたものに一致する要素に対してコントローラを登録します。
				 * <p>
				 * 1つのページに複数コントローラを登録することもできます。<br>
				 * 以下のように、登録したいコントローラ定義オブジェクトの数分、define()を実行して下さい。
				 *
				 * <pre>
				 * h5.ui.jqm.manager.define('pageA', 'css/pageA.css', controllerDefA, defAParams);
				 * h5.ui.jqm.manager.define('pageA', 'css/pageA.css', controllerDefB, defBParams);
				 * </pre>
				 *
				 * 注意:<br>
				 * ただし、ページに同じコントローラを2つ以上バインドすることはできません。<br>
				 * 同じコントローラであるかの判定は、コントローラ定義オブジェクトの<b>__name</b>プロパティの値がバインド済みのコントローラと同値であるか比較し、同値の場合はバインドされません。
				 *
				 * @param {String} id ページID
				 * @param {String|String[]} [cssSrc] CSSファイルのパス
				 * @param {Object} [controllerDefObject] コントローラ定義オブジェクト
				 * @param {Object} [initParam] 初期化パラメータ (ライフサイクルイベント(__construct, __init,
				 *            __ready)の引数にargsプロパティとして渡されます)
				 * @memberOf h5.ui.jqm.manager
				 * @function
				 * @name define
				 */
				define: function(id, cssSrc, controllerDefObject, initParam) {
					if (!isString(id)) {
						throwFwError(ERR_CODE_INVALID_TYPE, 'id');
					}

					if (cssSrc != null && !isString(cssSrc) && !isArray(cssSrc)) {
						throwFwError(ERR_CODE_INVALID_TYPE, 'cssSrc');
					}

					if (controllerDefObject != null) {
						if (isString(controllerDefObject) || isArray(controllerDefObject)) {
							throwFwError(ERR_CODE_NAME_INVALID_PARAMETER);
						}

						if (!$.isPlainObject(controllerDefObject)
								|| !('__name' in controllerDefObject)) {
							throwFwError(ERR_CODE_INVALID_TYPE, 'controllerDefObject');
						}

						if (initParam != null && !$.isPlainObject(initParam)) {
							throwFwError(ERR_CODE_INVALID_TYPE, 'initParam');
						}
					}

					if (!cssMap[id]) {
						cssMap[id] = [];
					}

					if (!controllerMap[id]) {
						controllerMap[id] = [];
					}

					if (!initParamMap[id]) {
						initParamMap[id] = [];
					}

					$.merge(cssMap[id], $.map($.makeArray(cssSrc), function(val, i) {
						if ($.inArray(val, cssMap[id]) !== -1) {
							fwLogger.info(FW_LOG_CSS_FILE_PATH_ALREADY_DEFINED, val);
							return null;
						}
						return val;
					}));

					if (controllerDefObject) {
						if ($.inArray(controllerDefObject, controllerMap[id]) === -1) {
							controllerMap[id].push(controllerDefObject);
							initParamMap[id].push(initParam);
						} else {
							fwLogger.info(FW_LOG_CONTROLLER_DEF_ALREADY_DEFINED,
									controllerDefObject.__name);
						}
					}

					if (isInitCalled && getActivePageId() !== null) {
						bindToActivePage();
					} else {
						this.init();
					}
				}
				/* del begin */
				,
				/*
				 * テスト用に公開
				 * JQMControllerが管理しているコントローラへの参照と、JQMControllerインスタンスへの参照を除去し、JQMControllerをdisposeをします。
				 *
				 * @memberOf h5.ui.jqm.manager
				 * @function
				 * @name __reset
				 */
				__reset: function() {
					if (jqmControllerInstance) {
						jqmControllerInstance.dispose();
						jqmControllerInstance = null;
					}
					controllerMap = {};
					controllerInstanceMap = {};
					dynamicControllerInstanceMap = {};
					initParamMap = {};
					cssMap = {};
					isInitCalled = false;
					hideEventFired = false;
					showEventFiredBeforeReady = false;
				}
			/* del end */
			});
})();
/* ------ h5.api.geo ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/** エラコード: 指定された緯度または経度の値が不正 */
	var ERR_CODE_INVALID_COORDS = 2000;
	/** エラーコード: getDistance()で、指定された計算モードの定数が不正 */
	var ERR_CODE_INVALID_GEOSYSTEM_CONSTANT = 2001;
	/** エラーコード: 位置情報の取得に失敗 */
	var ERR_CODE_POSITIONING_FAILURE = 2002;

	// =============================
	// Development Only
	// =============================

	/* del begin */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_INVALID_COORDS] = '正しい緯度または経度を指定して下さい。';
	errMsgMap[ERR_CODE_INVALID_GEOSYSTEM_CONSTANT] = '正しい計算モード定数を指定して下さい';
	errMsgMap[ERR_CODE_POSITIONING_FAILURE] = '位置情報の取得に失敗しました。';
	addFwErrorCodeMap(errMsgMap);
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// navigator.geolocationをキャッシュする変数
	var geo = null;
	function getGeo() {
		if (!geo) {
			geo = navigator.geolocation;
		}
		return geo;
	}

	var h5ua = h5.env.ua;

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	// =============================
	// Variables
	// =============================

	// =============================
	// Functions
	// =============================

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/**
	 * h5.api.geo.getDistance() の計算モードを指定するための定数クラス
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。以下のオブジェクトにアクセスするとインスタンスが返されます。
	 * </p>
	 * <ul>
	 * <li>h5.api.geo.GS_GRS80</li>
	 * <li>h5.api.geo.GS_BESSEL</li>
	 * </ul>
	 *
	 * @class
	 * @name GeodeticSystemEnum
	 */
	function GeodeticSystemEnum(oblateness, semiMajorAxis) {
		// 扁平率
		this.oblateness = oblateness;
		// 長(赤道)半径
		this.semiMajorAxis = semiMajorAxis;
	}
	/**
	 * 扁平率を取得します。
	 *
	 * @memberOf GeodeticSystemEnum
	 * @name getOblateness
	 * @returns {Number} 扁平率
	 */
	GeodeticSystemEnum.prototype.getOblateness = function() {
		return this.oblateness;
	};
	/**
	 * 長(赤道)半径を取得します。
	 *
	 * @memberOf GeodeticSystemEnum
	 * @name getSemiMajorAxis
	 * @returns {Number} 長(赤道)半径
	 */
	GeodeticSystemEnum.prototype.getSemiMajorAxis = function() {
		return this.semiMajorAxis;
	};

	/** 計算モード: 世界測地系(GRS80) */
	var GRS80 = new GeodeticSystemEnum(298.257222, 6378137);
	/** 計算モード: 日本測地系(BESSEL) */
	var BESSEL = new GeodeticSystemEnum(299.152813, 6377397.155);
	/** ラジアン毎秒 - 1度毎秒 */
	var DEGREES_PER_SECOND = Math.PI / 180;

	/**
	 * Geolocation API
	 *
	 * @memberOf h5.api
	 * @name geo
	 * @namespace
	 */
	function Geolocation() {
	// 空コンストラクタ
	}

	$.extend(Geolocation.prototype, {
		/**
		 * Geolocation APIが使用可能であるかの判定結果<br>
		 *
		 * @type Boolean
		 * @memberOf h5.api.geo
		 * @name isSupported
		 */
		// IE9の場合、navigator.geolocationにアクセスするとメモリーリークするのでエージェントで利用可能か判定する
		isSupported: (h5ua.isIE && h5ua.browserVersion >= 9) ? true : !!getGeo(),
		/**
		 * 現在地の緯度・経度を取得します。
		 *
		 * @memberOf h5.api.geo
		 * @name getCurrentPosition
		 * @function
		 * @param {Object} [option] 設定情報
		 * @param {Boolean} [option.enableHighAccuracy] 正確な位置を取得するか (ただし消費電力の増加や応答が遅延する)
		 * @param {Number} [option.timeout] 位置情報を取得するまで待機する時間 (ミリ秒)
		 * @param {Number} [option.maximumAge] キャッシュされた位置情報の有効期間を指定する (ミリ秒)
		 * @returns {Promise} Promiseオブジェクト
		 */
		getCurrentPosition: function(option) {
			var dfd = h5.async.deferred();
			getGeo().getCurrentPosition(function(geoPosition) {
				dfd.resolve(geoPosition);
			}, function(e) {
				dfd.reject(createRejectReason(ERR_CODE_POSITIONING_FAILURE, null, e));
			}, option);
			return dfd.promise();
		},
		/**
		 * 現在地の緯度・経度を定期的に送信します。
		 * <p>
		 * このメソッドは定期的に位置情報を取得するため、Deferred.progress()で値を取得します。<br>
		 * (Deferred.done()では値を取得できません。)
		 * <p>
		 * <b>実装例</b><br>
		 *
		 * <pre>
		 * h5.api.geo.watchPosition().progress(function(pos) {
		 * // 変数 pos に位置情報が格納されている。
		 * 		});
		 * </pre>
		 *
		 * @memberOf h5.api.geo
		 * @name watchPosition
		 * @function
		 * @param {Object} [option] 設定情報
		 * @param {Boolean} [option.enableHighAccuracy] 正確な位置を取得するか (ただし消費電力の増加や応答が遅延する)
		 * @param {Number} [option.timeout] 位置情報を取得するまで待機する時間 (ミリ秒)
		 * @param {Number} [option.maximumAge] キャッシュされた位置情報の有効期間を指定する (ミリ秒)
		 * @returns {WatchPositionPromise} WatchPositionPromiseオブジェクト
		 */
		watchPosition: function(option) {
			var dfd = h5.async.deferred();
			var id = getGeo().watchPosition(function(pos) {
				dfd.notify(pos);
			}, function(e) {
				getGeo().clearWatch(id);
				dfd.reject(createRejectReason(ERR_CODE_POSITIONING_FAILURE, null, e));
			}, option);
			/**
			 * h5.api.geo.watchPositionがこのオブジェクトをプロミス化して返します。
			 * <p>
			 * このオブジェクトは自分でnewすることはありません。<b>h5.api.geo.watchPosition</b>関数を呼び出すとインスタンスが返されます。
			 * </p>
			 *
			 * @class
			 * @name WatchPositionPromise
			 */
			function WatchPositionPromise() {
			// 空コンストラクタ
			}
			/**
			 * h5.api.geo.watchPositionで行っているユーザの位置監視を終了します。
			 * <p>
			 * ユーザの位置監視を終了し、Deferred.done()が実行されます。
			 * </p>
			 *
			 * @memberOf WatchPositionPromise
			 * @name unwatch
			 */
			WatchPositionPromise.prototype.unwatch = function() {
				getGeo().clearWatch(id);
				dfd.resolve();
			};
			return dfd.promise(new WatchPositionPromise());
		},
		/**
		 * ヒュベニの法則を使用して、2点間の緯度・経度から直線距離(m)を取得します。
		 * <p>
		 * 定数に使用している長半径・扁平率は国土地理院で紹介されている値を使用。
		 * <p>
		 * 注意:アルゴリズム上、長距離(100km以上)の地点を図る場合1m以上の誤差が出てしまいます。
		 * <h4>計算モードの指定方法</h4>
		 * 計算モードの指定は以下の定数クラスを使用します。<br>
		 * <table border="1">
		 * <tr>
		 * <td>h5.api.geo.GS_GRS80</td>
		 * <td>世界測地系</td>
		 * </tr>
		 * <tr>
		 * <td>h5.api.geo.GS_BESSEL</td>
		 * <td>日本測地系</td>
		 * </tr>
		 * </table>
		 *
		 * @memberOf h5.api.geo
		 * @name getDistance
		 * @function
		 * @param {Number} lat1 地点1の緯度
		 * @param {Number} lng1 地点1の経度
		 * @param {Number} lat2 地点2の緯度
		 * @param {Number} lng2 地点2の経度
		 * @param {GeodeticSystemEnum} [geoSystem] 計算モード定数
		 *            (h5.api.geo.GS_GRS80:世界測地系(未指定の場合このモードで計算する) / h5.api.geo.GS_BESSEL: 日本測地系)
		 * @returns {Number} 2点間の直線距離
		 */
		// TODO 長距離の場合も考えて、距離によって誤差が大きくならない『測地線航海算法』で計算するメソッドの追加も要検討
		getDistance: function(lat1, lng1, lat2, lng2, geoSystem) {
			if (!isFinite(lat1) || !isFinite(lng1) || !isFinite(lat2) || !isFinite(lng2)) {
				throwFwError(ERR_CODE_INVALID_COORDS);
			}
			var geodeticMode = geoSystem ? geoSystem : GRS80;
			if (!(geodeticMode instanceof GeodeticSystemEnum)) {
				throwFwError(ERR_CODE_INVALID_GEOSYSTEM_CONSTANT);
			}
			// 長半径(赤道半径)
			var A = geodeticMode.getSemiMajorAxis();
			// 扁平率
			var O = geodeticMode.getOblateness();
			// 起点の緯度のラジアン
			var latRad1 = lat1 * DEGREES_PER_SECOND;
			// 起点の経度のラジアン
			var lngRad1 = lng1 * DEGREES_PER_SECOND;
			// 終点の緯度のラジアン
			var latRad2 = lat2 * DEGREES_PER_SECOND;
			// 終点の経度のラジアン
			var lngRad2 = lng2 * DEGREES_PER_SECOND;
			// 2点の平均緯度
			var avgLat = (latRad1 + latRad2) / 2;
			// 第一離心率
			var e = (Math.sqrt(2 * O - 1)) / O;
			var e2 = Math.pow(e, 2);
			var W = Math.sqrt(1 - e2 * Math.pow(Math.sin(avgLat), 2));
			// 短半径(極半径)
			var semiminorAxis = A * (1 - e2);
			// 子午線曲率半径
			var M = semiminorAxis / Math.pow(W, 3);
			// 卯酉船曲率半径
			var N = A / W;
			// 2点の緯度差
			var deltaLat = latRad1 - latRad2;
			// 2点の経度差
			var deltaLon = lngRad1 - lngRad2;
			return Math.sqrt(Math.pow(M * deltaLat, 2)
					+ Math.pow(N * Math.cos(avgLat) * deltaLon, 2));
		},
		/**
		 * getDistanceメソッドで使用する計算モード定数 (世界測地系:GRS80)
		 *
		 * @constant
		 * @memberOf h5.api.geo
		 * @name GS_GRS80
		 */
		GS_GRS80: GRS80,
		/**
		 * getDistanceメソッドで使用する計算モード定数 (日本測地系:BESSEL)
		 *
		 * @constant
		 * @memberOf h5.api.geo
		 * @name GS_BESSEL
		 */
		GS_BESSEL: BESSEL
	});

	// =============================
	// Expose to window
	// =============================

	h5.u.obj.expose('h5.api', {
		geo: new Geolocation()
	});
})();
/* ------ h5.api.sqldb ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/** INSERT フォーマット */
	var INSERT_SQL_FORMAT = 'INSERT INTO {0} ({1}) VALUES ({2})';
	/** INSERT フォーマット(VALUES未指定) */
	var INSERT_SQL_EMPTY_VALUES = 'INSERT INTO {0} DEFAULT VALUES';
	/** SELECT フォーマット */
	var SELECT_SQL_FORMAT = 'SELECT {0} FROM {1}';
	/** UPDATE フォーマット */
	var UPDATE_SQL_FORMAT = 'UPDATE {0} SET {1}';
	/** DELETE フォーマット */
	var DELETE_SQL_FORMAT = 'DELETE FROM {0}';


	/** エラーコード: Insert/Sql/Del/Update/Select オブジェクトのexecute()が複数回実行された */
	var ERR_CODE_RETRY_SQL = 3000;
	/** エラーコード: 指定されたテーブル名が不正 */
	var ERR_CODE_INVALID_TABLE_NAME = 3001;
	/** エラーコード: 指定されたトランザクションの型が不正 */
	var ERR_CODE_INVALID_TRANSACTION_TYPE = 3002;
	/** エラーコード: where句に指定されたオペレータ文字列が不正 */
	var ERR_CODE_INVALID_OPERATOR = 3003;
	/** エラーコード: 引数で指定された型が不正 */
	var ERR_CODE_INVALID_PARAM_TYPE = 3004;
	/** エラーコード: 指定した取得カラム名が不正 */
	var ERR_CODE_INVALID_COLUMN_NAME = 3005;
	/** エラーコード: 指定したパラメータが不正 */
	var ERR_CODE_INVALID_VALUES = 3006;
	/** エラーコード: SQLのステートメントが不正 */
	var ERR_CODE_INVALID_STATEMENT = 3007;
	/** エラーコード: パラメータに指定したオブジェクトの型が不正 */
	var ERR_CODE_TYPE_NOT_ARRAY = 3008;
	/** エラーコード: transaction.add()に指定したオブジェクトの型が不正 */
	var ERR_CODE_INVALID_TRANSACTION_TARGET = 3009;
	/** エラーコード: トランザクション処理失敗 */
	var ERR_CODE_TRANSACTION_PROCESSING_FAILURE = 3010;
	/** エラーコード: where句に指定されたカラム名が不正 */
	var ERR_CODE_INVALID_COLUMN_NAME_IN_WHERE = 3011;

	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.api.sqldb');

	/* del begin */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_RETRY_SQL] = '同一オブジェクトによるSQLの再実行はできません。';
	errMsgMap[ERR_CODE_INVALID_TABLE_NAME] = '{0}: テーブル名を指定して下さい。';
	errMsgMap[ERR_CODE_INVALID_TRANSACTION_TYPE] = '{0}: トランザクションが不正です。';
	errMsgMap[ERR_CODE_INVALID_OPERATOR] = 'オペレータが不正です。 <= < >= > = != like のいずれかを使用して下さい。';
	errMsgMap[ERR_CODE_INVALID_PARAM_TYPE] = '{0}: {1}に指定したオブジェクトの型が不正です。';
	errMsgMap[ERR_CODE_INVALID_COLUMN_NAME] = '{0}: カラム名を指定して下さい。';
	errMsgMap[ERR_CODE_INVALID_VALUES] = '{0}: 値を指定して下さい。';
	errMsgMap[ERR_CODE_INVALID_STATEMENT] = '{0}: ステートメントが不正です。';
	errMsgMap[ERR_CODE_TYPE_NOT_ARRAY] = '{0}: パラメータは配列で指定して下さい。';
	errMsgMap[ERR_CODE_INVALID_TRANSACTION_TARGET] = '指定されたオブジェクトはトランザクションに追加できません。Insert/Update/Del/Select/Sqlクラスのインスタンスを指定して下さい。';
	errMsgMap[ERR_CODE_TRANSACTION_PROCESSING_FAILURE] = 'トランザクション処理中にエラーが発生しました。{0} {1}';
	errMsgMap[ERR_CODE_INVALID_COLUMN_NAME_IN_WHERE] = 'where句に指定されたカラム名が空白または空文字です。';
	addFwErrorCodeMap(errMsgMap);

	//SQLExceptionの例外メッセージ定義。dev版のみ出力される。
	//typeof SQLExceptionは、Android2-4, iOS4はundefined、iOS5-6はobject、PCのChrome26はfunctionになる。
	//このため、定数が定義されている環境でのみメッセージを出力することとする。
	var SQL_ERR_DATABASE = 'データベースエラー';
	var SQL_ERR_CONSTRAINT = '一意制約に反しています。';
	var SQL_ERR_QUOTA = '空き容量が不足しています。';
	var SQL_ERR_SYNTAX = '構文に誤りがあります。';
	var SQL_ERR_TIMEOUT = 'ロック要求がタイムアウトしました。';
	var SQL_ERR_TOO_LARGE = '取得結果の行が多すぎます。';
	var SQL_ERR_VERSION = 'データベースのバージョンが一致しません。';
	var SQL_ERR_UNKNOWN = 'トランザクション内で不明なエラーが発生、または例外がスローされました。';

	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	var getDeferred = h5.async.deferred;
	var format = h5.u.str.format;

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	/**
	 * SQLExceptionのエラーコードに対応するメッセージを取得します。
	 */
	function getTransactionErrorMsg(e) {
		var msg = 'SQLDB ERROR';

		/* del begin */
		if (e.DATABASE_ERR !== 'undefined') {
			//OperaやAndroid4系等、SQLExceptionがグローバルに公開されておらず
			//エラーオブジェクトを生成しないと定数が見えない環境があるので
			//実行時に定数の有無を判定してメッセージを入れる。
			//Android2、iOS4等実行時にも定数が存在しない場合はdev版でも汎用メッセージになる。
			//注：Android2、iOS4は実際にエラーが発生した時codeが必ず1になる
			switch (e.code) {
			case e.DATABASE_ERR:
				msg = SQL_ERR_DATABASE;
				break;
			case e.CONSTRAINT_ERR:
				msg = SQL_ERR_CONSTRAINT;
				break;
			case e.QUOTA_ERR:
				msg = SQL_ERR_QUOTA;
				break;
			case e.SYNTAX_ERR:
				msg = SQL_ERR_SYNTAX;
				break;
			case e.TIMEOUT_ERR:
				msg = SQL_ERR_TIMEOUT;
				break;
			case e.TOO_LARGE_ERR:
				msg = SQL_ERR_TOO_LARGE;
				break;
			case e.VERSION_ERR:
				msg = SQL_ERR_VERSION;
				break;
			case e.UNKNOWN_ERR:
				msg = SQL_ERR_UNKNOWN;
				break;
			}
		}
		/* del end */

		return msg + '(code=' + e.code + ')';
	}

	// =============================
	// Variables
	// =============================

	// =============================
	// Functions
	// =============================
	/**
	 * トランザクションエラー時に実行する共通処理
	 */
	function transactionErrorCallback(tasks, e) {
		for (var i = tasks.length - 1; i >= 0; i--) {
			var result = tasks[i];
			var msgParam = getTransactionErrorMsg(e);
			result.deferred.reject(createRejectReason(ERR_CODE_TRANSACTION_PROCESSING_FAILURE, [
					msgParam, e.message], e));
		}
	}

	/**
	 * トランザクション完了時に実行する共通処理
	 */
	function transactionSuccessCallback(tasks) {
		for (var i = tasks.length - 1; i >= 0; i--) {
			var result = tasks[i];
			result.deferred.resolve(result.result);
		}
	}

	/**
	 * 既にexecuteSql()の実行が完了した、またはexecute()が実行中の場合はエラーをスローします
	 */
	function executeCalled(recentTask) {
		if (!recentTask) {
			return;
		}

		var dfd = recentTask.deferred;

		if (isRejected(dfd) || isResolved(dfd) || !recentTask.result) {
			throwFwError(ERR_CODE_RETRY_SQL);
		}
	}

	/**
	 * DatabaseWrapper.select()/insert()/update()/del() のパラメータチェック
	 * <p>
	 * tableNameが未指定またはString型以外の型の値が指定された場合、例外をスローします。
	 */
	function validTableName(funcName, tableName) {
		if (!isString(tableName)) {
			throwFwError(ERR_CODE_INVALID_TABLE_NAME, funcName);
		}
	}

	/**
	 * DatabaseWrapper.select()/insert()/update()/del()/sql()/transaction() のパラメータチェック
	 * <p>
	 * txeがTransactionalExecutor型ではない場合、例外をスローします。<br>
	 * null,undefinedの場合は例外をスローしません。
	 */
	function isTransactionalExecutor(funcName, txe) {
		if (txe != undefined && !(txe instanceof TransactionalExecutor)) {
			throwFwError(ERR_CODE_INVALID_TRANSACTION_TYPE, funcName);
		}
	}

	/**
	 * 条件を保持するオブジェクトから、SQLのプレースホルダを含むWHERE文とパラメータの配列を生成します
	 */
	function setConditionAndParameters(whereObj, conditions, parameters) {
		if ($.isPlainObject(whereObj)) {
			for ( var prop in whereObj) {
				var params = $.trim(prop).replace(/ +/g, ' ').split(' ');
				var param = [];

				if (params[0] === "") {
					throwFwError(ERR_CODE_INVALID_COLUMN_NAME_IN_WHERE);
				} else if (params.length === 1) {
					param.push(params[0]);
					param.push('=');
					param.push('?');
				} else if (!/^(<=|<|>=|>|=|!=|like)$/i.test(params[1])) {
					throwFwError(ERR_CODE_INVALID_OPERATOR);
				} else if (params.length === 3 && /^like$/i.test(params[1])) {
					param.push(params[0]);
					param.push(params[1]);
					param.push('?');
					param.push('ESCAPE');
					param.push('\"' + params[2] + '\"');
				} else {
					param.push(params[0]);
					param.push(params[1]);
					param.push('?');
				}

				conditions.push(param.join(' '));
				parameters.push(whereObj[prop]);
			}
		}
	}

	/**
	 * Web SQL Databaseクラス
	 *
	 * @class
	 * @name WebSqlDatabase
	 */
	function WebSqlDatabase() {
	// 空コンストラクタ
	}

	/**
	 * Statementクラス
	 * <p>
	 * このクラスを継承しているクラスは<a href="TransactionalExecutor.html#add">TransactionalExecutor.add()</a>で追加できます。
	 * </p>
	 *
	 * @class
	 * @name Statement
	 */
	function Statement() {
		/**
		 * 1インスタンスで複数のステートメントを実行するか判定するフラグ このフラグがtrueの場合、execute()の実行結果を配列で返します
		 *
		 * @private
		 */
		this._multiple = false;
	}

	$.extend(Statement.prototype, {
		/**
		 * SQL文を実行します
		 *
		 * @memberOf Statement
		 * @return {TransactionalExecutor} TransactionalExecutorオブジェクト
		 */
		execute: function() {
			return this._executor.add(this)._execute(function(results) {
				return results[0]; // 配列に包まれていない実行結果を返す
			});
		}
	});

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/**
	 * SQLTransaction管理・実行クラス
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * <b>h5.api.sqldb.open().transaction()</b>を呼び出した場合と、
	 * Insert/Select/Update/Del/Sqlオブジェクトのexecute()が返すPromiseオブジェクトの、progressコールバックの引数に存在します。
	 * <p>
	 * ver1.1.7までは<b>Transaction</b>クラスと<b>TransactionWrapper</b>クラスが別々に存在していましたが、 ver1.1.8からは<b>TransactionalExecutor</b>クラスに統合されました。
	 * <p>
	 * 本クラスに存在する<b>execute()</b>と<b>add()</b>の使用方法は、Transactionクラスのexecute()とadd()と同じです。
	 *
	 * @class
	 * @name TransactionalExecutor
	 */
	function TransactionalExecutor(db) {
		this._db = db;
		this._df = getDeferred();
		this._tx = null;
		this._tasks = [];
		this._queue = [];
	}

	$.extend(TransactionalExecutor.prototype, {
		/**
		 * トランザクション処理中か判定します
		 *
		 * @private
		 * @memberOf TransactionalExecutor
		 * @function
		 * @returns {Boolean} true:実行中 / false: 未実行
		 */
		_runTransaction: function() {
			return this._tx != null;
		},
		/**
		 * トランザクション内で実行中のDeferredオブジェクトを管理対象として追加します。
		 *
		 * @private
		 * @memberOf TransactionalExecutor
		 * @function
		 * @param {Deferred} df Deferredオブジェクト
		 */
		_addTask: function(df) {
			this._tasks.push({
				deferred: df,
				result: null
			});
		},
		/**
		 * SQLの実行結果を設定します
		 *
		 * @private
		 * @memberOf TransactionalExecutor
		 * @function
		 * @param {Any} resul SQL実行結果
		 */
		_setResult: function(result) {
			this._getRecentTask().result = result;
		},
		/**
		 * 現在実行中のタスク情報を取得します
		 *
		 * @private
		 * @memberOf TransactionalExecutor
		 * @function
		 * @return {Any} タスク
		 */
		_getRecentTask: function() {
			return this._tasks[this._tasks.length - 1];
		},
		/**
		 * 1トランザクションで処理したいSQLをタスクに追加します。
		 * <p>
		 * このメソッドには、以下のクラスのインスタンスを追加することができます。
		 * <ul>
		 * <li><a href="Insert.html">Insert</a></li>
		 * <li><a href="Update.html">Update</a></li>
		 * <li><a href="Del.html">Del</a></li>
		 * <li><a href="Select.html">Select</a></li>
		 * <li><a href="Sql.html">Sql</a></li>
		 * </ul>
		 *
		 * @function
		 * @memberOf TransactionalExecutor
		 * @param {Insert|Update|Del|Select|Sql} statement Statementクラスのインスタンス
		 * @return {TransactionalExecutor} Transactionオブジェクト
		 */
		add: function(statement) {
			if (!(statement instanceof Statement)) {
				throwFwError(ERR_CODE_INVALID_TRANSACTION_TARGET);
			}

			var recentTask = this._getRecentTask();

			// execute()実行中はadd()できない
			if (!recentTask || recentTask.result) {
				this._queue.push(statement);
			}

			return this;
		},
		/**
		 * SQLを実行します
		 *
		 * @private
		 * @function
		 * @memberOf TransactionalExecutor
		 * @param {Function(Array)} completeCallback SQLの実行が全て完了し、notifyが呼ばれる直前に実行されるコールバック関数
		 * @return {TransactionalExecutor} TransactionalExecutorオブジェクト
		 */
		_execute: function(completeCallback) {
			var that = this;
			var df = this._df;
			var queue = this._queue;
			var results = [];

			function executeSql() {
				if (queue.length === 0) {
					var ret = completeCallback(results);
					that._setResult.apply(that, [ret]);
					df.notify(ret, that);
					return;
				}

				var statementObj = queue.shift();
				var statements = statementObj._statements;
				var parameters = statementObj._parameters;
				var p = getDeferred().resolve().promise();
				var ret = [];

				for (var i = 0, iLen = statements.length; i < iLen; i++) {
					(function(statement, parameter) {
						fwLogger.debug(wrapInArray(statement), wrapInArray(parameter));

						p = thenCompat(p, function() {
							var thenDf = getDeferred();

							that._tx.executeSql(statement, parameter, function(innerTx, rs) {
								ret.push(statementObj._onComplete(rs));
								thenDf.resolve();
							});

							return thenDf.promise();
						});

					})(statements[i], parameters[i]);
				}

				thenCompat(p, function() {
					// _multipleフラグがtrueの場合は実行結果を配列として返す
					var unwrapedRet = statementObj._multiple ? ret : ret[0];
					results.push(unwrapedRet);
					executeSql();
				});
			}

			try {
				executeCalled(this._getRecentTask());
				this._addTask(df);

				// トランザクション内で_buildStatementAndParameters()を実行すると、
				// SQL構文エラーがクライアントに返せないため、ここでステートメントとパラメータを生成する
				for (var j = 0, jLen = queue.length; j < jLen; j++) {
					queue[j]._buildStatementAndParameters();
				}

				if (this._runTransaction()) {
					executeSql();
				} else {
					this._db.transaction(function(tx) {
						that._tx = tx;
						executeSql();
					}, function(e) {
						that._tx = null;
						transactionErrorCallback(that._tasks, e);
					}, function() {
						that._tx = null;
						transactionSuccessCallback(that._tasks);
					});
				}
			} catch (e) {
				df.reject(e);
			}

			this._df = getDeferred();
			return df.promise();
		},
		/**
		 * add()で追加された順にSQLを実行します
		 * <p>
		 * 実行結果は、戻り値であるPromiseオブジェクトのprogress()に指定したコールバック関数、またはdone()に指定したコールバック関数に返されます。
		 *
		 * <pre>
		 *  db.transaction()
		 *   .add(db.insert('USER', {ID:10, NAME:TANAKA}))
		 *   .add(db.insert('USER', {ID:11, NAME:YOSHIDA}))
		 *   .add(db.insert('USER', {ID:12, NAME:SUZUKI})).execute().done(function(rs) {
		 *  　rs // 第一引数: 実行結果
		 *  });
		 * </pre>
		 *
		 * 実行結果は<b>配列(Array)</b>で返され、結果の格納順序は、<b>add()で追加した順序</b>に依存します。<br>
		 * 上記例の場合、3件 db.insert()をadd()で追加しているので、実行結果rsには3つのROWIDが格納されています。( [1, 2, 3]のような構造になっている )
		 * <p>
		 * また、progress()に指定したコールバック関数の第二引数には、トランザクションオブジェクトが格納され、このオブジェクトを使用することで、トランザクションを引き継ぐことができます。
		 *
		 * <pre>
		 *  db.select('PRODUCT', ['ID']).where({NAME: 'ball'}).execute().progress(function(rs, tx) {
		 * 　db.transaction(tx)
		 * 　　.add(db.update('UPDATE STOCK SET PRICE = 2000').where({ID: rs.item(0).ID}))
		 * 　　.execute();
		 *  });
		 * </pre>
		 *
		 * select().execute()で返ってきたトランザクションを、db.transaction()の引数に指定することで、db.select()とdb.transaction()は同一トランザクションで実行されます。
		 * <p>
		 * <h5>ver1.1.8からの変更点</h5>
		 * execute()が返すPromiseオブジェクトのprogressコールバックの第二引数(<b>TransactionalExecutor</b>インスタンス)に、
		 * Select/Insert/Del/Update/Sqlインスタンスをaddすることができるようになりました。
		 * <p>
		 * 下記のサンプルコードは、Statementインスタンスをtx.add()することにより、db.select()と同一トランザクションでSQLを実行しています。
		 *
		 * <pre>
		 *  db.transaction().add(db.select('PRODUCT', ['ID']).where({NAME: 'ballA'})).execute().progress(function(rsArray, tx) {
		 * 　　tx.add(db.sql(' STOCK', {COUNT:20}).where({ID: rsArray[0].item(0).ID})).execute();
		 *  });
		 * </pre>
		 *
		 * @function
		 * @memberOf TransactionalExecutor
		 * @returns {Promise} Promiseオブジェクト
		 */
		execute: function() {
			return this._execute(function(results) {
				// add()されたStatementの数に関係なく、結果は配列に包んで返す
				return results;
			});
		},
		/**
		 * SQLの実行結果を受け取ることができる、Promiseオブジェクトを取得します
		 *
		 * @function
		 * @memberOf TransactionalExecutor
		 * @returns {Promise} Promiseオブジェクト
		 */
		promise: function() {
			return this._df.promise();
		}
	});

	/**
	 * 指定されたテーブルに対して、検索処理(SELECT)を行うクラス
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * <b>h5.api.sqldb.open().select()</b>を呼び出すと、このクラスのインスタンスが返されます。
	 *
	 * @class
	 * @name Select
	 */
	function Select(executor, tableName, columns) {
		this._statements = [];
		this._parameters = [];
		this._executor = executor;
		this._tableName = tableName;
		this._columns = isArray(columns) ? columns.join(', ') : '*';
		this._where = null;
		this._orderBy = null;
	}

	Select.prototype = new Statement();
	$.extend(Select.prototype, {
		/**
		 * WHERE句を設定します
		 * <p>
		 * <b>条件は以下の方法で設定できます。</b><br>
		 * <ul>
		 * <li>オブジェクト</li>
		 * <li>文字列</li>
		 * </ul>
		 * <b>オブジェクト</b>の場合、キーに『<b>カラム名[半角スペース]オペレータ</b>』、バリューに<b>値</b>を指定します。
		 * <p>
		 * 例. IDが0以上100以下。
		 *
		 * <pre>
		 * db.select('USER', '*').where({
		 * 	'ID &gt;': 0,
		 * 	'ID &lt;=': 100
		 * })
		 * </pre>
		 *
		 * オペレータで使用可能な文字は以下の通りです。
		 * <ul>
		 * <li> &lt;=</li>
		 * <li> &lt;</li>
		 * <li> &gt;=</li>
		 * <li> &gt;</li>
		 * <li> =</li>
		 * <li> !=</li>
		 * <li> like (sqliteの仕様上大文字・小文字を区別しない)</li>
		 * </ul>
		 * 条件を複数指定した場合、全てAND句で結合されます。 AND句以外の条件で結合したい場合は<b>文字列</b>で条件を指定して下さい。
		 * <p>
		 * <b>エスケープ文字の指定方法</b><br>
		 * キーに『<b>カラム名[半角スペース]オペレータ[半角スペース]エスケープ文字</b>』のように指定します。 <br>
		 * エスケープ文字はクォートやダブルクォートで囲わず、エスケープ文字のみ指定して下さい。
		 * <p>
		 * 例. $をエスケープ文字として指定する場合
		 *
		 * <pre>
		 * db.select('USER', '*').where({
		 * 	'NAME like $': 'SUZUKI$'
		 * });
		 * </pre>
		 *
		 * <p>
		 * <b>文字列</b>の場合、SQLステートメントに追加するWHERE文を指定します。
		 * <p>
		 * 例. IDが0以上100以下。
		 *
		 * <pre>
		 * db.select('USER', '*').where('ID &gt;= 10 AND ID &lt;= 100');
		 * </pre>
		 *
		 * @function
		 * @memberOf Select
		 * @param {Object|String} whereObj 条件
		 * @returns {Select} Selectオブジェクト
		 */
		where: function(whereObj) {
			if (!$.isPlainObject(whereObj) && !isString(whereObj)) {
				throwFwError(ERR_CODE_INVALID_PARAM_TYPE, ['Select', 'where']);
			}

			this._where = whereObj;
			return this;
		},
		/**
		 * ORDER BY句を設定します
		 * <p>
		 * ソート対象のカラムが一つの場合は<b>文字列</b>、複数の場合は<b>配列</b>で指定します。
		 * <p>
		 * 例.IDを降順でソートする場合
		 *
		 * <pre>
		 * db.select('USER', '*').orderBy('ID DESC');
		 * </pre>
		 *
		 * 例.IDを降順、NAMEを昇順でソートする場合
		 *
		 * <pre>
		 * db.select('USER', '*').orderBy(['ID DESC', 'NAME ASC']);
		 * </pre>
		 *
		 * なお、複数の条件が指定されている場合、ソートは配列の先頭に指定されたカラムから順番に実行されます。
		 *
		 * @function
		 * @memberOf Select
		 * @param {Array|String} orderBy 条件
		 * @returns {Select} Selectオブジェクト
		 */
		orderBy: function(orderByObj) {
			if (!$.isPlainObject(orderByObj) && !isString(orderByObj)) {
				throwFwError(ERR_CODE_INVALID_PARAM_TYPE, ['Select', 'orderBy']);
			}

			this._orderBy = wrapInArray(orderByObj);
			return this;
		},
		/**
		 * SQLの構文とパラメータを生成します
		 *
		 * @private
		 * @function
		 * @memberOf Select
		 */
		_buildStatementAndParameters: function() {
			var statement = '';
			var where = this._where;

			statement = format(SELECT_SQL_FORMAT, this._columns, this._tableName);

			if ($.isPlainObject(where)) {
				var conditions = [];
				setConditionAndParameters(where, conditions, this._parameters);
				statement += (' WHERE ' + conditions.join(' AND '));
			} else if (isString(where)) {
				statement += (' WHERE ' + where);
			}

			if (isArray(this._orderBy)) {
				statement += (' ORDER BY ' + this._orderBy.join(', '));
			}

			this._statements.push([statement]);
			this._parameters = [this._parameters];
		},
		/**
		 * executeSql成功時の処理を実行します
		 *
		 * @private
		 * @function
		 * @memberOf Select
		 * @param {ResultSet} rs SQL実行結果
		 * @return {Any} クライアントが取得するSQL実行結果
		 */
		_onComplete: function(rs) {
			return rs.rows;
		}
	});


	/**
	 * 指定されたテーブルに対して、登録処理(INSERT)を行うクラス
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * <b>h5.api.sqldb.open().insert()</b>を呼び出すと、このクラスのインスタンスが返されます。
	 *
	 * @class
	 * @name Insert
	 */
	function Insert(executor, tableName, values) {
		this._statements = [];
		this._parameters = [];
		this._executor = executor;
		this._tableName = tableName;
		this._values = values ? wrapInArray(values) : [];
		this._df = getDeferred();
		// 1インスタンスで複数のSQLを実行するのでフラグを立てる
		this._multiple = true;
	}

	Insert.prototype = new Statement();
	$.extend(Insert.prototype, {
		/**
		 * SQLの構文とパラメータを生成します
		 *
		 * @private
		 * @function
		 * @memberOf Insert
		 */
		_buildStatementAndParameters: function() {
			var values = this._values;
			var statements = this._statements;
			var parameters = this._parameters;

			if (values.length === 0) {
				statements.push(format(INSERT_SQL_EMPTY_VALUES, this._tableName));
				parameters.push([]);
				return;
			}

			for (var i = 0, len = values.length; i < len; i++) {
				var valueObj = values[i];

				if (valueObj == null) {
					statements.push(format(INSERT_SQL_EMPTY_VALUES, this._tableName));
					parameters.push([]);
				} else if ($.isPlainObject(valueObj)) {
					var value = [];
					var column = [];
					var param = [];

					for ( var prop in valueObj) {
						value.push('?');
						column.push(prop);
						param.push(valueObj[prop]);
					}

					statements.push(format(INSERT_SQL_FORMAT, this._tableName, column.join(', '),
							value.join(', ')));
					parameters.push(param);
				}
			}
		},
		/**
		 * executeSql成功時の処理を実行します
		 *
		 * @private
		 * @function
		 * @memberOf Insert
		 * @param {ResultSet} rs SQL実行結果
		 * @return {Any} クライアントが取得するSQL実行結果
		 */
		_onComplete: function(rs) {
			return rs.insertId;
		}
	});

	/**
	 * 指定されたテーブルに対して、更新処理(UPDATE)を行うクラス
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * <b>h5.api.sqldb.open().update()</b>を呼び出すと、このクラスのインスタンスが返されます。
	 *
	 * @class
	 * @name Update
	 */
	function Update(executor, tableName, values) {
		this._statements = [];
		this._parameters = [];
		this._executor = executor;
		this._tableName = tableName;
		this._values = values;
		this._where = null;
	}

	Update.prototype = new Statement();
	$.extend(Update.prototype, {
		/**
		 * WHERE句を設定します
		 * <p>
		 * <b>条件は以下の方法で設定できます。</b><br>
		 * <ul>
		 * <li>オブジェク</li>
		 * <li>文字列</li>
		 * </ul>
		 * <b>オブジェクト</b>の場合、キーに『<b>カラム名[半角スペース]オペレータ</b>』、バリューに<b>値</b>を指定します。
		 * <p>
		 * 例. IDが0以上100以下。
		 *
		 * <pre>
		 * db.update('USER', {
		 * 	NAME: 'TANAKA'
		 * }).where({
		 * 	'ID &gt;': 0,
		 * 	'ID &lt;=': 100
		 * })
		 * </pre>
		 *
		 * オペレータで使用可能な文字は以下の通りです。
		 * <ul>
		 * <li> &lt;=</li>
		 * <li> &lt;</li>
		 * <li> &gt;=</li>
		 * <li> &gt;</li>
		 * <li> =</li>
		 * <li> !=</li>
		 * <li> like (sqliteの仕様上大文字・小文字を区別しない)</li>
		 * </ul>
		 * 条件を複数指定した場合、全てAND句で結合されます。 AND句以外の条件で結合したい場合は文字列で条件を指定して下さい。
		 * <p>
		 * <b>エスケープ文字の指定方法</b><br>
		 * キーに『<b>カラム名[半角スペース]オペレータ[半角スペース]エスケープ文字</b>』のように指定します。 <br>
		 * エスケープ文字はクォートやダブルクォートで囲わず、エスケープ文字のみ指定して下さい。
		 * <p>
		 * 例. $をエスケープ文字として指定する場合
		 *
		 * <pre>
		 * db.update('USER', {
		 * 	NAME: 'TANAKA'
		 * }).where({
		 * 	'NAME like $': 'SUZUKI$'
		 * });
		 * </pre>
		 *
		 * <p>
		 * <b>文字列</b>の場合、SQLステートメントに追加するWHERE文を指定します。
		 * <p>
		 * 例. IDが0以上100以下。
		 *
		 * <pre>
		 * db.update('USER').where('ID &gt;= 10 AND ID &lt;= 100')
		 * </pre>
		 *
		 * @function
		 * @memberOf Update
		 * @param {Object|String} whereObj 条件
		 * @returns {Update} Updateオブジェクト
		 */
		where: function(whereObj) {
			if (!$.isPlainObject(whereObj) && !isString(whereObj)) {
				throwFwError(ERR_CODE_INVALID_PARAM_TYPE, ['Update', 'where']);
			}

			this._where = whereObj;
			return this;
		},
		/**
		 * SQLの構文とパラメータを生成します
		 *
		 * @private
		 * @function
		 * @memberOf Update
		 */
		_buildStatementAndParameters: function() {
			var statement = '';
			var where = this._where;
			var values = this._values;
			var columns = [];

			for ( var prop in values) {
				columns.push(prop + ' = ?');
				this._parameters.push(values[prop]);
			}

			statement = format(UPDATE_SQL_FORMAT, this._tableName, columns.join(', '));

			if ($.isPlainObject(where)) {
				var conditions = [];
				setConditionAndParameters(where, conditions, this._parameters);
				statement += (' WHERE ' + conditions.join(' AND '));
			} else if (isString(where)) {
				statement += (' WHERE ' + where);
			}

			this._statements.push([statement]);
			this._parameters = [this._parameters];
		},
		/**
		 * executeSql成功時の処理を実行します
		 *
		 * @private
		 * @function
		 * @memberOf Update
		 * @param {ResultSet} rs SQL実行結果
		 * @return {Any} クライアントが取得するSQL実行結果
		 */
		_onComplete: function(rs) {
			return rs.rowsAffected;
		}
	});

	/**
	 * 指定されたテーブルに対して、削除処理(DELETE)を行うクラス。
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * <b>h5.api.sqldb.open().del()</b>を呼び出すと、このクラスのインスタンスが返されます。
	 * <p>
	 * <i>deleteは予約語なため、Delとしています。</i>
	 *
	 * @class
	 * @name Del
	 */
	function Del(executor, tableName) {
		this._statements = [];
		this._parameters = [];
		this._executor = executor;
		this._tableName = tableName;
		this._where = null;
	}

	Del.prototype = new Statement();
	$.extend(Del.prototype, {
		/**
		 * WHERE句を設定します
		 * <p>
		 * <b>条件は以下の方法で設定できます。</b><br>
		 * <ul>
		 * <li>オブジェクト</li>
		 * <li>文字列</li>
		 * </ul>
		 * <b>オブジェクト</b>の場合、キーに『<b>カラム名[半角スペース]オペレータ</b>』、バリューに<b>値</b>を指定します。
		 * <p>
		 * 例. IDが0以上100以下。
		 *
		 * <pre>
		 * db.delete('USER').where({'ID &gt;':0, 'ID &lt;=':100})
		 * </pre>
		 *
		 * オペレータで使用可能な文字は以下の通りです。
		 * <ul>
		 * <li> &lt;=</li>
		 * <li> &lt;</li>
		 * <li> &gt;=</li>
		 * <li> &gt;</li>
		 * <li> =</li>
		 * <li> !=</li>
		 * <li> like (sqliteの仕様上大文字・小文字を区別しない)</li>
		 * </ul>
		 * 条件を複数指定した場合、全てAND句で結合されます。 AND句以外の条件で結合したい場合は文字列で条件を指定して下さい。
		 * <p>
		 * <b>エスケープ文字の指定方法</b><br>
		 * キーに『<b>カラム名[半角スペース]オペレータ[半角スペース]エスケープ文字</b>』のように指定します。 <br>
		 * エスケープ文字はクォートやダブルクォートで囲わず、エスケープ文字のみ指定して下さい。
		 * <p>
		 * 例. $をエスケープ文字として指定する場合
		 *
		 * <pre>
		 * db.delete('USER').where({'NAME like $': 'SUZUKI$'});
		 * </pre>
		 *
		 * <p>
		 * <b>文字列</b>の場合、SQLステートメントに追加するWHERE文を指定します。
		 * <p>
		 * 例. IDが0以上100以下。
		 *
		 * <pre>
		 * db.delete('USER').where('ID &gt;= 10 AND ID &lt;= 100')
		 * </pre>
		 *
		 * @function
		 * @memberOf Del
		 * @param {Object|String} whereObj 条件
		 * @returns {Del} Delオブジェクト
		 */
		where: function(whereObj) {
			if (!$.isPlainObject(whereObj) && !isString(whereObj)) {
				throwFwError(ERR_CODE_INVALID_PARAM_TYPE, ['Del', 'where']);
			}

			this._where = whereObj;
			return this;
		},
		/**
		 * SQLの構文とパラメータを生成します
		 *
		 * @private
		 * @function
		 * @memberOf Del
		 */
		_buildStatementAndParameters: function() {
			var statement = '';
			var where = this._where;

			statement = format(DELETE_SQL_FORMAT, this._tableName);

			if ($.isPlainObject(where)) {
				var conditions = [];
				setConditionAndParameters(where, conditions, this._parameters);
				statement += (' WHERE ' + conditions.join(' AND '));
			} else if (isString(where)) {
				statement += (' WHERE ' + where);
			}

			this._statements.push([statement]);
			this._parameters = [this._parameters];
		},
		/**
		 * executeSql成功時の処理を実行します
		 *
		 * @private
		 * @function
		 * @memberOf Del
		 * @param {ResultSet} rs SQL実行結果
		 * @return {Any} クライアントが取得するSQL実行結果
		 */
		_onComplete: function(rs) {
			return rs.rowsAffected;
		}
	});

	/**
	 * 指定されたSQLステートメントを実行するクラス
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * <b>h5.api.sqldb.open().sql()</b>を呼び出すと、このクラスのインスタンスが返されます。
	 *
	 * @class
	 * @name Sql
	 */
	function Sql(executor, statement, params) {
		this._statements = [];
		this._parameters = [];
		this._executor = executor;
		this._statements.push(statement);
		this._parameters.push(params || []);
	}

	Sql.prototype = new Statement();
	$.extend(Sql.prototype, {
		/**
		 * SQLの構文とパラメータを生成します
		 *
		 * @private
		 * @function
		 * @memberOf Sql
		 */
		_buildStatementAndParameters: function() {
		// 既にコンストラクタで渡されているため何もしない
		},
		/**
		 * executeSql成功時の処理を実行します
		 *
		 * @private
		 * @function
		 * @memberOf Sql
		 * @param {ResultSet} rs SQL実行結果
		 * @return {Any} クライアントが取得するSQL実行結果
		 */
		_onComplete: function(rs) {
			return rs;
		}
	});

	/**
	 * Database拡張クラス
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * <b>h5.api.sqldb.open()</b>を呼び出すと、このクラスのインスタンスが返されます。
	 *
	 * @class
	 * @name DatabaseWrapper
	 */
	/**
	 * @param {Database} db openDatabase()が返すネイティブのDatabaseオブジェクト
	 */
	function DatabaseWrapper(db) {
		this._db = db;
	}

	$.extend(DatabaseWrapper.prototype, {
		/**
		 * 指定されたテーブルに対して、検索処理(SELECT)を行うためのオブジェクトを生成します
		 *
		 * @memberOf DatabaseWrapper
		 * @function
		 * @param {String} tableName テーブル名
		 * @param {Array} columns カラム
		 * @param {TransactionalExecutor} [txe] TransactionalExecutorクラス
		 * @returns {Select} SELECTオブジェクト
		 */
		select: function(tableName, columns, txe) {
			validTableName('select', tableName);

			if (!isArray(columns) && columns !== '*') {
				throwFwError(ERR_CODE_INVALID_COLUMN_NAME, 'select');
			}

			return new Select(this.transaction(txe), tableName, columns);
		},
		/**
		 * 指定されたテーブルに対して、登録処理(INSERT)を行うためのオブジェクトを生成します
		 * <p>
		 * <b>第二引数valuesの指定方法</b>
		 * <p>
		 * 1テーブルに1件INSERTを行う場合は<b>オブジェクト</b>で値を指定します。また、1テーブルに複数件INSERTを行う場合は<b>配列</b>で値を指定します。<br>
		 * <p>
		 * オブジェクトで指定する場合、シンタックスは以下のようになります。
		 *
		 * <pre>
		 * {カラム名:登録する値, ...}
		 * </pre>
		 *
		 * <p>
		 * 例.USERテーブルに、1件レコードをINSERTする。
		 *
		 * <pre>
		 * db.insert('USER', {
		 * 	ID: 10,
		 * 	NAME: 'TANAKA'
		 * }).execute();
		 * </pre>
		 *
		 * <p>
		 * 配列で指定する場合、シンタックスは以下のようになります。
		 *
		 * <pre>
		 * [{カラム名:登録する値, ...}, {カラム名:登録する値, ...}, ...]
		 * </pre>
		 *
		 * <p>
		 * 例.USERテーブルに、3件レコードをINSERTする。
		 *
		 * <pre>
		 * db.insert('USER', [{
		 * 	ID: 1,
		 * 	NAME: 'TANAKA'
		 * }, {
		 * 	ID: 2,
		 * 	NAME: 'YAMADA'
		 * }, {
		 * 	ID: 3,
		 * 	NAME: 'SUZUKI'
		 * }]).execute();
		 * </pre>
		 *
		 * @memberOf DatabaseWrapper
		 * @function
		 * @param {String} tableName テーブル名
		 * @param {Object|Array} values 値(登録情報を保持するオブジェクトまたは、登録情報のオブジェクトを複数保持する配列)
		 * @param {TransactionalExecutor} [txe] TransactionalExecutorクラス
		 * @returns {Insert} INSERTオブジェクト
		 */
		insert: function(tableName, values, txe) {
			validTableName('insert', tableName);

			if (values != null && !isArray(values) && !$.isPlainObject(values)) {
				throwFwError(ERR_CODE_INVALID_VALUES, 'insert');
			}

			return new Insert(this.transaction(txe), tableName, values);
		},
		/**
		 * 指定されたテーブルに対して、更新処理(UPDATE)を行うためのオブジェクトを生成します
		 * <p>
		 * <b>第二引数valuesの指定方法</b>
		 * <p>
		 * オブジェクトリテラルで以下のように指定します。
		 *
		 * <pre>
		 * {
		 * 	カラム名: 更新後の値
		 * }
		 * </pre>
		 *
		 * <p>
		 * 例.USERテーブルのNAMEカラムを"TANAKA"に更新する。
		 *
		 * <pre>
		 * db.update('USER', {
		 * 	NAME: 'TANAKA'
		 * }).excute();
		 * </pre>
		 *
		 * @memberOf DatabaseWrapper
		 * @function
		 * @param {String} tableName テーブル名
		 * @param {Object} values カラム
		 * @param {TransactionalExecutor} [txe] TransactionalExecutorクラス
		 * @returns {Update} Updateオブジェクト
		 */
		update: function(tableName, values, txe) {
			validTableName('update', tableName);

			if (!$.isPlainObject(values)) {
				throwFwError(ERR_CODE_INVALID_VALUES, 'update');
			}

			return new Update(this.transaction(txe), tableName, values);
		},
		/**
		 * 指定されたテーブルに対して、削除処理(DELETE)を行うためのオブジェクトを生成します
		 * <p>
		 * <i>deleteは予約語なため、delとしています。</i>
		 *
		 * @memberOf DatabaseWrapper
		 * @function
		 * @param {String} tableName テーブル名
		 * @param {TransactionalExecutor} [txe] TransactionalExecutorクラス
		 * @returns {Del} Delオブジェクト
		 */
		del: function(tableName, txe) {
			validTableName('del', tableName);

			return new Del(this.transaction(txe), tableName);
		},
		/**
		 * 指定されたステートメントとパラメータから、SQLを実行するためのオブジェクトを生成します
		 *
		 * @memberOf DatabaseWrapper
		 * @function
		 * @param {String} statement SQLステートメント
		 * @param {Array} parameters パラメータ
		 * @param {TransactionalExecutor} [txe] TransactionalExecutorクラス
		 * @returns {Sql} Sqlオブジェクト
		 */
		sql: function(statement, parameters, txe) {
			if (!isString(statement)) {
				throwFwError(ERR_CODE_INVALID_STATEMENT, 'sql');
			}

			if (parameters != null && !isArray(parameters)) {
				throwFwError(ERR_CODE_TYPE_NOT_ARRAY, 'sql');
			}

			return new Sql(this.transaction(txe), statement, parameters);
		},
		/**
		 * 指定された複数のSQLを同一トランザクションで実行するためのオブジェクトを生成します
		 *
		 * @memberOf DatabaseWrapper
		 * @function
		 * @param {TransactionalExecutor} [txe] TransactionalExecutorクラス
		 * @returns {TransactionalExecutor} TransactionalExecutorオブジェクト
		 */
		transaction: function(txe) {
			isTransactionalExecutor('transaction', txe);
			return txe ? txe : new TransactionalExecutor(this._db);
		}
	});

	/**
	 * Web SQL Database
	 *
	 * @memberOf h5.api
	 * @name sqldb
	 * @namespace
	 */
	$.extend(WebSqlDatabase.prototype, {
		/**
		 * Web SQL Databaseが使用可能であるかの判定結果
		 *
		 * @memberOf h5.api.sqldb
		 * @name isSupported
		 * @type Boolean
		 */
		isSupported: !!window.openDatabase,
		/**
		 * データベースに接続します。
		 *
		 * @memberOf h5.api.sqldb
		 * @name open
		 * @function
		 * @param {String} name データベース名
		 * @param {String} [version] バージョン
		 * @param {String} [displayName] 表示用データベース名
		 * @param {Number} [estimatedSize] 見込み容量(バイト)
		 * @returns {DatabaseWrapper} Databaseオブジェクト
		 */
		open: function(name, version, displayName, estimatedSize) {
			if (!this.isSupported) {
				return;
			}

			var conn = openDatabase(name, version, displayName, estimatedSize);
			return new DatabaseWrapper(conn);
		}
	});

	// =============================
	// Expose to window
	// =============================

	h5.u.obj.expose('h5.api', {
		sqldb: new WebSqlDatabase()
	});
})();
/* ------ h5.api.storage ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.api.storage');
	/* del begin */
	var FW_LOG_STORAGE_SUPPORTED = 'local storage supported:{0}, session storage supported:{1}';
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	// =============================
	// Functions
	// =============================
	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	function WebStorage(storage) {
		/**
		 * ストレージオブジェクト(localStorage/sessionStorage)
		 *
		 * @member h5.api.storage.local
		 * @name storage
		 * @type Storage
		 * @private
		 */
		this._storage = storage;
	}

	/**
	 * Web Storage
	 *
	 * @memberOf h5.api
	 * @name storage
	 * @namespace
	 */
	$.extend(WebStorage.prototype, {
		/**
		 * ストレージに保存されている、キーと値のペアの数を取得します。
		 *
		 * @memberOf h5.api.storage.local
		 * @name getLength
		 * @function
		 * @returns {Number} キーとペアの数
		 */
		getLength: function() {
			return this._storage.length;
		},

		/**
		 * 指定されたインデックスにあるキーを、ストレージから取得します。
		 *
		 * @memberOf h5.api.storage.local
		 * @name key
		 * @function
		 * @param {Number} index インデックス
		 * @returns {String} キー
		 */
		key: function(index) {
			return this._storage.key(index);
		},

		/**
		 * 指定されたキーに紐付く値を、ストレージから取得します。
		 * <p>
		 * 自動的にsetItem()実行時に保存したときの型に戻します。
		 *
		 * @memberOf h5.api.storage.local
		 * @name getItem
		 * @function
		 * @param {String} key キー
		 * @returns {Any} キーに紐付く値
		 */
		getItem: function(key) {
			var str = this._storage.getItem(key);
			if (str === null) {
				return null;
			}
			return h5.u.obj.deserialize(str);
		},

		/**
		 * 指定されたキーで、値をストレージに保存します。
		 * <p>
		 * 値は、シリアライズして保存します。保存できる型は<a href="./h5.u.obj.html#serialize">h5.u.obj.serialize()</a>を参照してください。
		 * </p>
		 *
		 * @memberOf h5.api.storage.local
		 * @name setItem
		 * @function
		 * @param {String} key キー
		 * @param {Any} value 値
		 */
		setItem: function(key, value) {
			this._storage.setItem(key, h5.u.obj.serialize(value));
		},

		/**
		 * 指定されたキーに紐付く値を、ストレージから削除します。
		 *
		 * @memberOf h5.api.storage.local
		 * @name removeItem
		 * @function
		 * @param {String} key キー
		 */
		removeItem: function(key) {
			this._storage.removeItem(key);
		},

		/**
		 * ストレージに保存されている全てのキーとそれに紐付く値を全て削除します。
		 *
		 * @memberOf h5.api.storage.local
		 * @name clear
		 * @function
		 */
		clear: function() {
			this._storage.clear();
		},

		/**
		 * 現在ストレージに保存されているオブジェクト数分、キーと値をペアで取得します。
		 *
		 * @memberOf h5.api.storage.local
		 * @name each
		 * @function
		 * @param {Function} callback インデックス, キー, 値 を引数に持つコールバック関数
		 */
		each: function(callback) {
			var storage = this._storage;

			for (var i = 0, len = storage.length; i < len; i++) {
				var k = storage.key(i);
				callback(i, k, this.getItem(k));
			}
		}
	});

	// =============================
	// Expose to window
	// =============================

	h5.u.obj.expose('h5.api.storage', {
		/**
		 * ブラウザがこのAPIをサポートしているか。
		 *
		 * @memberOf h5.api.storage
		 * @name isSupported
		 * @type Boolean
		 */
		// APIはlocalStorageとsessionStorageに分かれており、本来であればそれぞれサポート判定する必要があるが、
		// 仕様ではStorage APIとして一つに扱われておりかつ、テストした限りでは片方のみ使用できるブラウザが見つからない為、一括りに判定している。
		// safari(PC,iOS)のプライベートブラウズモードでは、localStorageオブジェクトはあるがsetItem()を使用すると例外が発生するため、
		// try-catchでチェックして、例外が発生するかどうかをチェックし、例外が発生した場合はisSupported===falseにする。issue
		isSupported: window.localStorage ? (function() {
			try {
				var checkKey = '__H5_WEB_STORAGE_CHECK__';
				window.localStorage.setItem(checkKey, 'ok');
				window.localStorage.removeItem(checkKey);
				return true;
			} catch (e) {
				return false;
			}
		})() : false,
		/**
		 * ローカルストレージ
		 *
		 * @memberOf h5.api.storage
		 * @name local
		 * @namespace
		 */
		local: new WebStorage(window.localStorage),
		/**
		 * セッションストレージ
		 *
		 * @memberOf h5.api.storage
		 * @name session
		 * @namespace
		 */
		session: new WebStorage(window.sessionStorage)
	});

	/* del begin */
	fwLogger.debug(FW_LOG_STORAGE_SUPPORTED, !!window.localStorage, !!window.sessionStorage);
	/* del end */
})();
/* ------ h5.scene ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	/**
	 * コントローラーバインド用データ属性名
	 */
	var DATA_H5_CONTROLLER = 'data-h5-controller';

	/**
	 * バインド済みコントローラー設定用データ属性名
	 */
	var DATA_H5_DYN_CONTROLLER_BOUND = 'data-h5-dyn-controller-bound';

	/**
	 * デフォルトシーン指定用データ属性名
	 */
	var DATA_H5_DEFAULT_SCENE = 'data-h5-default-scene';

	/**
	 * シーン指定用データ属性名
	 */
	var DATA_H5_SCENE = 'data-h5-scene';

	/**
	 * シーンコンテナ指定用データ属性名
	 */
	var DATA_H5_CONTAINER = 'data-h5-container';

	/**
	 * メインシーンコンテナ指定用データ属性名
	 */
	var DATA_H5_MAIN_CONTAINER = 'data-h5-main-container';

	/**
	 * コンテナ生成済み識別用データ属性名
	 */
	var DATA_H5_DYN_CONTAINER_BOUND = 'data-h5-dyn-container-bound';

	/**
	 * BODY要素のダミーDIV識別用データー属性名
	 */
	var DATA_H5_DYN_DUMMY_BODY = 'data-h5-dyn-dummy-body';

	/**
	 * シーンコンテナに対するシーンの変更要求イベント名
	 */
	var EVENT_SCENE_CHANGE_REQUEST = 'sceneChangeRequest';

	// =============================
	// Production
	// =============================

	var REMOTE_METHOD_INVOCATION = '__h5__RMI';

	var REMOTE_METHOD_INVOCATION_RESULT = '__h5__RMI_Result';

	// エラーコード
	/** エラーコード: scan関数の対象要素が単一でない */
	var ERR_CODE_SCAN_MULTIPLE_ELEMENT = 100000;
	/** エラーコード: コンテナ生成時にカレントとなるシーン要素が見つからない */
	var ERR_CODE_CURRENT_SCENE_NOT_FOUND = 100001;
	/** エラーコード: ロードしたHTML内に指定のコンテナが存在しない */
	var ERR_CODE_TARGET_CONTAINER_NOT_FOUND = 100002;
	/** エラーコード: メインシーンコンテナを複数生成しようとした */
	var ERR_CODE_MAIN_CONTAINER_ALREADY_CREATED = 100003;
	/** エラーコード: シーン遷移先に文字列以外を指定した */
	var ERR_CODE_CHANGE_SCENE_TO_IS_NOT_STRING = 100004;
	/** エラーコード: シーン遷移先にハッシュを指定した */
	var ERR_CODE_CHANGE_SCENE_HASH_IN_TO = 100005;
	/** エラーコード: メインシーンコンテナの遷移先にコントローラーを指定した(暫定対応) */
	var ERR_CODE_MAIN_CHANGE_SCENE_TO_IS_CONTROLLER = 100006;
	/** エラーコード: 指定された遷移効果が存在しない */
	var ERR_CODE_TRANSITION_NOT_FOUND = 100007;
	/** エラーコード: シーンコンテナ生成済みの要素でシーンコンテナを作成しようとした */
	var ERR_CODE_CONTAINER_ALREADY_CREATED = 100008;
	/** エラーコード: シーン遷移先HTMLのロードに失敗した */
	var ERR_CODE_HTML_LOAD_FAILED = 100009;
	/** コンテナ生成済みマークがあるにも関わらず所定のコントローラーがバインドされていない */
	var ERR_CODE_CONTAINER_CONTROLLER_NOT_FOUND = 100010;


	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.scene');

	/* del begin */
	//	var FW_LOG_H5_WHEN_INVALID_PARAMETER = 'h5.scene.when: 引数にpromiseオブジェクトでないものが含まれています。';
	/**
	 * 各エラーコードに対応するメッセージ
	 */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_SCAN_MULTIPLE_ELEMENT] = 'h5.scene.scan() の第1引数に複数要素は指定できません。単一要素で指定してください。';
	errMsgMap[ERR_CODE_CURRENT_SCENE_NOT_FOUND] = 'カレントとなるシーン要素が見つかりません。';
	errMsgMap[ERR_CODE_TARGET_CONTAINER_NOT_FOUND] = 'ロードしたHTMLに、指定されたコンテナ要素が見つかりません。to:{0} container:{1}';
	errMsgMap[ERR_CODE_MAIN_CONTAINER_ALREADY_CREATED] = 'メインシーンコンテナはすでに生成されているため、生成できません。';
	errMsgMap[ERR_CODE_CHANGE_SCENE_TO_IS_NOT_STRING] = 'シーン遷移先は文字列で指定してください。to:{0}';
	errMsgMap[ERR_CODE_CHANGE_SCENE_HASH_IN_TO] = 'シーン遷移先にハッシュは指定できません。to:{0}';
	errMsgMap[ERR_CODE_MAIN_CHANGE_SCENE_TO_IS_CONTROLLER] = '現在、メインシーンコンテナのシーン遷移先にコントローラーは指定できません。to:{0}';
	errMsgMap[ERR_CODE_TRANSITION_NOT_FOUND] = '指定された遷移効果は存在しません。transition:{0}';
	errMsgMap[ERR_CODE_CONTAINER_ALREADY_CREATED] = '対象要素ですでにシーンコンテナが生成されているため、生成できません。';
	errMsgMap[ERR_CODE_HTML_LOAD_FAILED] = 'シーン遷移先HTMLのロードに失敗しました。to:{0}';
	errMsgMap[ERR_CODE_CONTAINER_CONTROLLER_NOT_FOUND] = '要素にコンテナ生成済みマークがあるにも関わらず所定のコントローラーがバインドされていません。';

	// メッセージの登録
	addFwErrorCodeMap(errMsgMap);
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	var isDisposing = h5internal.core.isDisposing;

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	/**
	 * シーン機能初回適用判定フラグ
	 */
	var isInited = false;

	// =============================
	// Functions
	// =============================
	/**
	 * デフォルトシーンのシーンコントローラを取得する。
	 *
	 * @private
	 * @returns controller
	 */
	function getDefaultSceneController() {
		var bodyController = h5.core.controllerManager.getControllers(document.body)[0];

		return bodyController;
	}

	/**
	 * 対象要素配下のすべての要素にバインドされているコントローラーをdispseします。
	 *
	 * @private
	 * @param element 対象要素
	 */
	function disposeAllControllers(element) {
		var controllers = h5.core.controllerManager.getControllers(element, {
			deep: true
		});
		for (var i = 0, len = controllers.length; i < len; i++) {
			if (!isDisposing(controllers[i])) {
				controllers[i].dispose();
			}
		}
	}

	/**
	 * ルート要素自身も対象として走査します。
	 *
	 * @private
	 * @param target
	 * @param expr
	 * @returns {jQuery}
	 */
	function findWithSelf(target, expr) {
		var self = $(target).filter(expr);
		var children = $(target).find(expr);
		if (self.length === 0) {
			return children;
		} else if (children.length === 0) {
			return self;
		}
		self = $.makeArray(self);
		children = $.makeArray(children);
		return $(self.concat(children));
	}

	/**
	 * data-h5-default-sceneでdata-h5-controller指定がない場合用のダミーコントローラー
	 */
	var DummyController = {
		__name: 'h5.scene.DummyController'
	};

	/**
	 * 要素がシーン属性を持っているかをチェックします
	 *
	 * @private
	 * @param target
	 * @returns {Boolean}
	 */
	function isScene(target) {
		return $(target).is('[' + DATA_H5_DEFAULT_SCENE + '],[' + DATA_H5_SCENE + ']');
	}

	/**
	 * 要素の上方直近のシーン要素を取得します
	 *
	 * @private
	 * @param target
	 * @returns {Element}
	 */
	function getParentScene(target) {
		var parentScene = $(target).closest(
				'[' + DATA_H5_DEFAULT_SCENE + '],[' + DATA_H5_SCENE + ']');
		return parentScene.length ? parentScene.get(0) : null;
	}

	/**
	 * 要素がコンテナ属性を持っているかをチェックします
	 * <p>
	 * body、mainタグがメインシーンコンテナの場合、事前にDATA_H5_MAIN_CONTAINERが付与されている前提
	 * </p>
	 *
	 * @private
	 * @param target
	 * @returns {Boolean}
	 */
	function isContainer(target) {
		return $(target).is('[' + DATA_H5_MAIN_CONTAINER + '],[' + DATA_H5_CONTAINER + ']');
	}

	/**
	 * 要素の上方直近のコンテナ要素を取得します
	 *
	 * @private
	 * @param target
	 * @returns {Element}
	 */
	function getParentContainer(target) {
		var parentContainer = $(target).closest(
				'[' + DATA_H5_MAIN_CONTAINER + '],[' + DATA_H5_CONTAINER + ']');
		return parentContainer.length ? parentContainer.get(0) : null;
	}

	/**
	 * 対象要素が指定シーン要素の直属であるかをチェックします
	 * <p>
	 * コンテナ化前の要素も存在するため、シーン属性のチェックのみでは判定できない
	 * </p>
	 *
	 * @private
	 * @param target
	 * @param scene
	 * @returns {Boolean}
	 */
	function checkScene(target, scene) {

		// TODO(鈴木) 同一ならtrue(両方nullは想定していない)
		if (target === scene)
			return true;

		// TODO(鈴木) 対象要素上方直近のコンテナ要素
		var targetContainer = getParentContainer(target);

		// TODO(鈴木) 指定シーン要素のコンテナ要素。指定シーン要素がない場合はnull。
		var container = scene ? getParentContainer(scene) : null;

		// TODO(鈴木) コンテナ要素が一致しない場合はfalse
		if (targetContainer !== container) {
			return false;
		}

		// TODO(鈴木) 対象要素上方直近のシーン要素が、指定シーン要素に一致すればtrue、そうでなければfalse
		return getParentScene(target) === scene;
	}

	/**
	 * 対象要素を配下を含めて走査し、DATA属性に基づいてコントローラーをバインド、およびシーンコンテナを生成します。
	 * <p>
	 * DATA属性については以下を参照してください。<br/>
	 * </p>
	 * <ul>
	 * <li><a href="/conts/web/view/reference/scene-spec">リファレンス（仕様詳細)&gt;&gt;画面遷移制御・履歴管理(シーン機能)仕様
	 * [ver.1.2]</a>
	 * <ul>
	 * <li><a
	 * href="/conts/web/view/reference/scene-spec#HHTML306E8A188FF0306B57FA30653044305F81EA52D5751F6210">HTMLの記述に基づいた自動生成</a></li>
	 * <li><a
	 * href="/conts/web/view/reference/scene-spec#HHTML89817D20306E8A188FF0306B57FA30653044305F30B330F330C830ED30FC30E9306E81EA52D530D030A430F330C9">
	 * HTML要素の記述に基づいたコントローラの自動バインド</a></li>
	 * </ul>
	 * </li>
	 * </ul>
	 * <p>
	 * 対象要素がシーンであり、かつコントローラーがバインドされていない場合にPromiseオブジェクトを返却します。
	 * その場合、コントローラーがロード・バインドされたタイミングでresolveが実行されます。 シーンに対応するコントローラーを取得したい場合に利用してください。
	 * </p>
	 * <p>
	 * メインシーンコンテナが未生成で、h5.settings.scene.autoCreateMainContainerにtrueが設定されている場合、
	 * 所定の条件で対象要素および配下を走査し、最初の該当の要素でメインシーンコンテナを生成します。 条件の詳細については上述のリンクを参照してください
	 * </p>
	 * <p>
	 * シーンコンテナ要素配下は、デフォルトで表示されるシーン配下のみを対象とします。(現版ではシーンコンテナの複数シーンは未対応)
	 * このため、シーンコンテナ直下でないシーン要素は、シーンコンテナに所属していないとみなされ、その配下は処理対象とならないので注意が必要です。
	 * </p>
	 * <p>
	 * シーンコンテナ生成済み要素配下は走査対象となりません。追加要素を対象としたい場合ははその部分を指定するようにしてください。
	 * </p>
	 *
	 * @memberOf h5.scene
	 * @param {Element} [rootElement=document.body] 走査処理対象のルート要素。指定なしの場合はdocument.bodyをルート要素とします。
	 * @param {String} [controllerName]
	 *            バインド対象コントローラー名。指定なしの場合は'data-h5-controller'属性に指定されたすべてのコントローラーを対象とします。
	 * @param {Any} [args] 走査対象のルート要素がコンテナの場合、デフォルトで表示されるシーンコントローラー生成時に渡される引数を設定します。
	 * @returns {Promise} Promiseオブジェクト。詳細については当関数の説明を参照してください。
	 */
	function scan(rootElement, controllerName, args) {

		// TODO(鈴木) デフォルトをBODYにする実装を有効化
		var root = rootElement ? rootElement : document.body;

		var $root = $(root);

		if ($root.length === 0) {
			return;
		}

		// TODO(鈴木) 対象要素は一つに限定
		if ($root.length !== 1) {
			throwFwError(ERR_CODE_SCAN_MULTIPLE_ELEMENT);
		}

		// TODO(鈴木) メインシーンコンテナができていない場合のみ実行。
		// この時点でメインシーンコンテナにはdata-h5-main-container属性があるようにする。
		if (!mainContainer && h5.settings.scene.autoCreateMainContainer) {
			var main = findWithSelf(root, '[' + DATA_H5_MAIN_CONTAINER + ']');
			if (main.length === 0) {
				main = findWithSelf(root, 'main');
				if (main.length === 0 && root === document.body) {
					main = $(root);
				}
				if (main.length > 0) {
					main.eq(0).attr(DATA_H5_MAIN_CONTAINER, DATA_H5_MAIN_CONTAINER);
				}
			}
		}

		// TODO(鈴木) rootElementがシーンコンテナの場合
		// この場合promiseは返さない
		// createSceneContainer→scanForContainer→scanとなり再帰になる
		if ($root.is('[' + DATA_H5_CONTAINER + ']')) {
			createSceneContainer(root);
			return;
		} else if ($root.is('[' + DATA_H5_MAIN_CONTAINER + ']')) {
			createSceneContainer(root, true);
			return;
		}

		// TODO(鈴木) 以下、rootElementがシーンコンテナでない場合

		// TODO(鈴木) シーンコントローラーをresolveで返却すべきか否か
		// scanがシーン要素を対象としており、コントローラーがバインドされていない場合に返却する
		var resolveSceneController = isScene(root) && !alreadyBound(root);

		var dfd = resolveSceneController ? h5.async.deferred() : null;

		// 処理対象となるシーン要素取得(自身か、上方直近のシーン要素)
		var currentScene = isScene(root) ? root : getParentScene(root);

		// TODO(鈴木) シーンコントローラーが見つかったか
		var isFound = false;

		// TODO(鈴木) コントローラーのバインド
		findWithSelf(root, '[' + DATA_H5_CONTROLLER + ']').each(
				function() {
					var attrControllers = this.getAttribute(DATA_H5_CONTROLLER);

					var attrControllerNameList = attrControllers.split(',');

					for (var i = 0, len = attrControllerNameList.length; i < len; i++) {

						// TODO(鈴木) getFullnameの仕様不明のため暫定回避
						//var attrControllerName = getFullname($.trim(attrControllerNameList[i]));
						var attrControllerName = $.trim(attrControllerNameList[i]);

						if (attrControllerName === '') {
							// trimした結果空文字になる場合は何もしない
							return true;
						}

						if (controllerName && attrControllerName !== controllerName) {
							// バインドしたいコントローラが指定されていて、その指定と異なっている場合は次を検索
							return true;
						}

						// 既に「同じ名前の」コントローラがバインドされていたら何もしない
						if (!alreadyBound(this, attrControllerName)) {

							// TODO(鈴木) 対象シーン要素直属でなければ処理しない
							if (!checkScene(this, currentScene)) {
								return true;
							}

							// TODO(鈴木) 対象シーンのシーンコントローラーであるか否か
							var isCurrent = false;

							//TODO(鈴木) シーンコントローラーを返却する必要がある場合で、また見つかっておらず、
							// 処理対象が対象シーン要素自体である場合。
							// isFoundフラグにより、同一要素複数コントローラーの場合は、先頭のコントローラーのみ対象となる
							if (resolveSceneController && !isFound && this === root) {
								isFound = true;
								isCurrent = true;
							}

							markBoundController(this, attrControllerName);

							// TODO(鈴木) デフォルトのシーンコントローラーである場合のみパラメータを渡す
							var loadControllerPromise = loadController(attrControllerName, this,
									isCurrent ? args : null);

							//TODO(鈴木) デフォルトのシーンコントローラーである場合のみ、コントローラーをresolveで返す
							if (isCurrent) {
								loadControllerPromise.done(function(controller) {
									dfd.resolve(controller);
								});
							}
						}
					}
				});

		// TODO(鈴木) シーンコンテナの探索と生成
		$root.find('[' + DATA_H5_MAIN_CONTAINER + '],[' + DATA_H5_CONTAINER + ']').each(function() {

			// TODO(鈴木) 対象シーン要素直属でなければ処理しない
			if (checkScene(this, currentScene)) {
				return true;
			}

			var $container = $(this);
			if ($container.is('[' + DATA_H5_MAIN_CONTAINER + ']')) {
				createSceneContainer(this, true);
			} else if ($container.is('[' + DATA_H5_CONTAINER + ']')) {
				createSceneContainer(this);
			}

		});

		if (resolveSceneController) {
			return dfd.promise();
		}
		return;
	}

	/**
	 * コントローラーがバインド済みであるかをチェックします
	 *
	 * @private
	 * @param element
	 * @param controllerName
	 * @returns {Boolean}
	 */
	function alreadyBound(element, controllerName) {
		// TODO
		// 一時しのぎ、getControllers()でバインド途中のコントローラも取得できるようにすべき
		// var controllers = h5.core.controllerManager.getControllers(element);

		var controllers = $(element).attr(DATA_H5_DYN_CONTROLLER_BOUND);

		if (!controllers)
			return false;

		controllers = controllers.split(',');

		// controllerNameが指定されない場合は、何らかのコントローラーがバインドされていればtrueを返す
		if (!controllerName && controllers.length > 0) {
			return true;
		}
		for (var i = 0; i < controllers.length; i++) {
			// if(controllers[i].__name === controllerName){
			if ($.trim(controllers[i]) === controllerName) {
				return true;
			}
		}
		return false;
	}

	/**
	 * コントローラーがバインドされたことをマークします(暫定)
	 *
	 * @private
	 * @param target
	 * @param name
	 */
	function markBoundController(target, name) {
		var attr = $(target).attr(DATA_H5_DYN_CONTROLLER_BOUND) || '';
		if (attr)
			attr += ',';
		attr += name;
		$(target).attr(DATA_H5_DYN_CONTROLLER_BOUND, attr);
	}

	/**
	 * scan関数分割。シーンコンテナを作成用です。
	 * <p>
	 * カレントシーンとなる要素の探索と、そのコントローラー指定なしの場合のダミーコントローラーバインドを行います。
	 * </p>
	 *
	 * @private
	 * @param rootElement
	 * @param controllerName
	 * @param args
	 * @returns {Promise}
	 */
	function scanForContainer(rootElement, controllerName, args) {

		var root = rootElement ? rootElement : document.body;

		var dfd = h5.async.deferred();

		// TODO(鈴木) 処理対象がシーンコンテナである場合、スキップする実装が必要。

		// TODO(鈴木)
		var isFound = false;
		var dummyController = null;

		// TODO(鈴木) data-h5-default-scene属性を持つ要素が直下に存在するかの確認
		var defaultSceneElm = $(root).find('>[' + DATA_H5_DEFAULT_SCENE + ']');
		// TODO(鈴木) 先頭要素がdata-h5-controllerを属性持っていない場合、ダミーのコントローラーをバインドしてresolve
		if (defaultSceneElm.length > 0) {
			var elm = defaultSceneElm.eq(0);
			if (!alreadyBound(elm)) {
				isFound = true;
				if (!elm.is('[' + DATA_H5_CONTROLLER + ']')) {
					markBoundController(elm, DummyController.__name);
					dummyController = h5.core.controller(elm, DummyController, args);
					dfd.resolve(dummyController);
				}
			}
		}

		if (!isFound) {
			// TODO(鈴木) data-h5-scene属性を持つ要素が直下先頭に存在するかの確認
			var sceneElm = $(root).children().eq(0).filter('[' + DATA_H5_SCENE + ']');
			if (sceneElm.length > 0) {
				if (!alreadyBound(sceneElm)) {
					isFound = true;
					sceneElm.attr(DATA_H5_DEFAULT_SCENE, DATA_H5_DEFAULT_SCENE);
					defaultSceneElm = sceneElm;
					//TODO(鈴木) 先頭要素がdata-h5-controllerを属性持っていない場合、ダミーのコントローラーをバインドしてresolve
					if (!sceneElm.is('[' + DATA_H5_CONTROLLER + ']')) {
						markBoundController(sceneElm, DummyController.__name);
						dummyController = h5.core.controller(sceneElm, DummyController, args);
						dfd.resolve(dummyController);
					}
				}
			}
		}

		// TODO(鈴木) カレントとなるシーン要素が見つからない場合はエラー
		if (!isFound) {
			throwFwError(ERR_CODE_CURRENT_SCENE_NOT_FOUND);
		}

		// TODO(鈴木) カレントとなるシーン要素のみscan
		var promise = scan(defaultSceneElm.get(0), controllerName, args);

		// TODO(鈴木) デフォルトコントローラーがバインド・返却されていなければscanの結果を使用する
		if (!isResolved(dfd)) {
			promise.done(function(controller) {
				dfd.resolve(controller);
			});
		}

		return dfd.promise();
	}

	/**
	 * コントローラーファイルのロードとコントローラーの生成
	 *
	 * @private
	 * @param name
	 * @param rootElement
	 * @param args
	 * @returns {Promise}
	 */
	function loadController(name, rootElement, args) {
		var dfd = h5.async.deferred();
		h5.res.get(name).then(function(Controller) {
			var controller = h5.core.controller(rootElement, Controller, args);
			dfd.resolve(controller);
		});
		return dfd.promise();
	}

	function TypedMessage(type, data) {
		this.type = type;
		this.data = data;
	}

	function MessageChannel(type, targetWindow) {
		this.type = type;

		this._targetWindow = targetWindow;

		this._closed = false;

		this._subscribers = [];

		var that = this;

		this._recv = function(event) {
			that._receiveMessage(event.originalEvent);
		};

		$(window).on('message', this._recv);
	}
	h5.mixin.eventDispatcher.mix(MessageChannel.prototype);
	$.extend(MessageChannel.prototype, {
		send: function(data) {
			if (this._closed) {
				// TODO fwErrorを投げる
				alert('クローズ済みのチャネルです。送信できません。');
				return;
			}

			var msg = new TypedMessage(this.type, data);

			var msgSerialized = h5.u.obj.serialize(msg);

			// TODO originを指定できるようにする, IE8-にoriginがないので対応が必要
			this._targetWindow.postMessage(msgSerialized, location.origin);
		},

		subscribe: function(func, thisObj) {
			var s = {
				func: func,
				thisObj: thisObj ? thisObj : null
			};

			this._subscribers.push(s);
		},

		close: function() {
			this._closed = true;
			this.off(window, 'message', this._recv);
		},

		_receiveMessage: function(event) {
			var msg;

			try {
				msg = h5.u.obj.deserialize(event.data);

				if (msg.type !== this.type) {
					return;
				}
			} catch (e) {
				fwLogger.debug('メッセージをデシリアライズできませんでした。無視します。');
				return;
			}

			var subers = this._subscribers;
			for (var i = 0, len = subers.length; i < len; i++) {
				var s = subers[i];
				s.func.call(s.thisObj, msg.data);
			}

			var ev = {
				type: 'message',
				data: msg.data
			};

			this.dispatchEvent(ev);
		}

	});

	// type:String -> MessageChannelインスタンス
	var singletonMessageChannelMap = {};

	/**
	 * type毎に一意なMessageChannelインスタンスを取得する。
	 *
	 * @returns channel
	 */
	function getMessageChannel(type, win) {
		var channel = singletonMessageChannelMap[type];

		if (!channel) {
			channel = new MessageChannel(type, win);
			singletonMessageChannelMap[type] = channel;
		}

		return channel;
	}

	// =========================================================================
	//
	// Classes
	//
	// =========================================================================

	// =============================
	// RemoteInvocation
	// =============================

	var RMI_STATUS_SUCCESS = 0;
	var RMI_STATUS_EXCEPTION = 1;
	var RMI_STATUS_ASYNC_RESOLVED = 2;
	var RMI_STATUS_ASYNC_REJECTED = 3;
	var RMI_STATUS_METHOD_NOT_FOUND = 4;

	function RMIReceiver() {
		this._recvChannel = new MessageChannel(REMOTE_METHOD_INVOCATION, window.opener);
		this._recvChannel.subscribe(this._receive, this);

		this._sendChannel = new MessageChannel(REMOTE_METHOD_INVOCATION_RESULT, window.opener);
	}
	$.extend(RMIReceiver.prototype, {
		_receive: function(data) {
			var controller = getDefaultSceneController();

			var id = data.id;
			var method = data.method;
			var args = data.args;

			if (!controller[method] || isFunction(controller[method])) {
				this._callFunction(id, controller, method, args);
			} else {
				this._sendChannel.send({
					id: id,
					isAsync: false,
					status: RMI_STATUS_METHOD_NOT_FOUND,
					result: null
				});
			}
		},

		_callFunction: function(id, controller, method, args) {
			args = wrapInArray(args);

			var ret = undefined;
			try {
				ret = controller[method].apply(controller, args);
			} catch (e) {
				this._sendChannel.send({
					id: id,
					isAsync: false,
					status: RMI_STATUS_EXCEPTION,
					result: null
				});
				return;
			}

			var that = this;

			// TODO コード整理
			if (h5.async.isPromise(ret)) {
				ret.done(function(/* var_args */) {
					var value = h5.u.obj.argsToArray(arguments);

					that._sendChannel.send({
						id: id,
						isAsync: true,
						status: RMI_STATUS_ASYNC_RESOLVED,
						result: value
					});
				}).fail(function(/* var_args */) {
					var value = h5.u.obj.argsToArray(arguments);

					that._sendChannel.send({
						id: id,
						isAsync: true,
						status: RMI_STATUS_ASYNC_REJECTED,
						result: value
					});

				});
			} else {
				this._sendChannel.send({
					id: id,
					isAsync: false,
					status: RMI_STATUS_SUCCESS,
					result: ret
				});
			}

		}
	});

	// =============================
	// RemoteInvocation
	// =============================

	function RemoteMethodInvocation(targetWindow) {
		this.targetWindow = targetWindow;

		// TODO channel id は一意になるように生成する
		this.id = 'FIXME';

		// TODO channelはmessageイベントを1つだけonしてハンドラを共有する
		// id -> dfd
		this._invocationMap = {};

		// TODO createSequenceは別ファイルにしたい
		this._invocationSeq = h5.core.data.createSequence(1, 1, h5.core.data.SEQ_INT);

		// TODO MessageChannelは、同一ウィンドウ、かつ、同一チャネルにのみ伝わるようにすべき(channel idの導入)
		this._sendChannel = getMessageChannel(REMOTE_METHOD_INVOCATION, targetWindow);

		this._recvChannel = getMessageChannel(REMOTE_METHOD_INVOCATION_RESULT, targetWindow);
		this._recvChannel.subscribe(this._receive, this);
	}
	$.extend(RemoteMethodInvocation.prototype, {
		invoke: function(method, args) {
			var dfd = h5.async.deferred();

			var data = {
				id: this._invocationSeq.next(),
				method: method,
				args: args
			};

			this._invocationMap[data.id] = dfd;

			this._sendChannel.send(data);

			return dfd.promise();
		},

		_receive: function(data) {
			var id = data.id;
			var dfd = this._invocationMap[id];

			if (!dfd) {
				// TODO fwLogger
				return;
			}

			delete this._invocationMap[id];

			var ret = data.result;
			var isAsync = data.isAsync;
			var status = data.status;

			if (!isAsync) {
				if (status === RMI_STATUS_SUCCESS) {
					dfd.resolve(ret);
				} else {
					dfd.reject();
				}
			} else {
				if (status === RMI_STATUS_ASYNC_RESOLVED) {
					dfd.resolve.apply(dfd, ret);
				} else {
					dfd.reject.apply(dfd, ret);
				}
			}

		}
	});

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	// 子ウィンドウの場合
	if (window.opener) {
		new RMIReceiver();
	}

	/**
	 * シーンクラス
	 * <p>
	 * コントローラ化の際に、コントローラに"scene"プロパティが追加され、コントローラごとに生成されるこのクラスのインスタンスが格納されます
	 * </p>
	 *
	 * @class
	 */
	/**
	 * @private
	 * @param {Controller} controller
	 */
	function Scene(controller) {
		this.__controller = controller;
	}

	$.extend(Scene.prototype, {
		/**
		 * シーン遷移イベントを発行します。
		 *
		 * @param {String|Object} data
		 * @memberOf ControllerScene
		 */
		navigate: function(data) {
			if (isDisposing(this.__controller)) {
				// TODO エラー
				return;
			}
			this.__controller.trigger(EVENT_SCENE_CHANGE_REQUEST, data);
		},

		/**
		 * このコントローラを直接包含しているシーンコンテナを取得します。
		 * <p>
		 * シーンコンテナ要素が存在しない、またはシーンコンテナ未生成の場合はnullを返却します。
		 * </p>
		 *
		 * @returns {SceneContainerController} シーンコンテナ
		 * @memberOf ControllerScene
		 */
		getParentSceneContainer: function() {
			if (isDisposing(this.__controller)) {
				return null;
			}
			var element = getParentContainer(this.__controller.rootElement);
			if (!element) {
				return null;
			}
			return getSceneContainer(element);
		}
	});

	function InvocationProxy() {
	// 空コンストラクタ
	}

	function RemoteWindow(url, windowName, features, isModal) {
		var win = window.open(url, windowName, features);

		this.window = win;

		this._isModal = false;

		this._parentBlocker = null;

		this.setModal(isModal === true ? true : false);

		this._rmi = new RemoteMethodInvocation(win);

		this._watchChild();
	}
	$.extend(RemoteWindow.prototype, {
		invoke: function(method, args) {
			return this._rmi.invoke(method, args);
		},

		getControllerProxy: function(selector) {
			var proxy = new InvocationProxy();

			return proxy;
		},

		setModal: function(value) {
			if (this._isModal == value) {
				return;
			}

			// TODO 外部化
			// h5.messageBundle.scene.MODAL_NOTICE = '子ウィンドウを開いている間は操作できません';
			var message = '子ウィンドウを開いている間は操作できません。';

			if (this._isModal) {
				// true -> false なので親ウィンドウのブロックを外す
				this._parentBlocker.hide();
				this._parentBlocker = null;
			} else {
				// false -> trueなので親ウィンドウをブロックする
				this._parentBlocker = h5.ui.indicator({
					target: 'body',
					block: true,
					message: message,
					showThrobber: false
				}).show();
			}

			this._isModal = value;
		},

		close: function() {
			var dfd = h5.async.deferred();

			this.window.close();

			return dfd.promise();
		},

		_watchChild: function() {
			var that = this;

			// TODO setModal(false)のときは監視しないようにする
			function watch() {
				if (that.window.closed) {
					clearInterval(tid);
					that.setModal(false);
				}
			}

			var tid = setInterval(watch, 300);
		}
	});

	// TODO(鈴木) シーンクラス削除

	/**
	 * 別ウィンドウをオープンします。
	 *
	 * @param url
	 * @param name
	 * @param features
	 * @param isModal
	 * @param controllerName
	 * @param param
	 * @returns {Promise} プロミス。完了するとRemoteWindowオブジェクトを返します。
	 */
	function openWindow(url, name, features, isModal, controllerName, args) {
		var dfd = h5.async.deferred();

		var remote = new RemoteWindow(url, name, features, isModal);

		// FIXME window側のURLのロードが完了し、存在する場合にコントローラのreadyが完了したらresolve
		setTimeout(function() {
			dfd.resolve(remote);
		}, 100);

		return dfd.promise();
	}

	// TODO(鈴木) シーンタイプ関連実装削除

	/**
	 * HTMLコメント削除用正規表現
	 */
	var htmlCommentRegexp = /<!--(?:\s|\S)*?-->/g;

	/**
	 * BODYタグ内容抽出用正規表現
	 */
	var bodyTagRegExp = /<body\b([^>]*)>((?:\s|\S)*?)(?:<\/body\s*>|<\/html\s*>|$)/i;

	/**
	 * HTML文字列からBODYタグ内容部分抽出
	 * <p>
	 * BODYタグがある場合、戻り値はDIVタグで囲む。<br>
	 * BODYタグの属性をそのDIVに追加する。(既存BODYタグの属性を操作することはしない)<br>
	 * data-main-container属性を追加する。<br>
	 * </p>
	 * <p>
	 * BODYタグがない場合は文字列をそのまま返す。
	 * </p>
	 *
	 * @private
	 * @param html
	 * @returns {String}
	 */
	function extractBody(html) {
		// TODO(鈴木) この場合HTMLコメントは消える。HTMLコメント内にbodyタグがない前提であれば楽だが。。
		// HTMLコメントも保存するよう実装すべきか？
		var match = html.replace(htmlCommentRegexp, '').match(bodyTagRegExp);
		if (match) {
			return '<div ' + DATA_H5_DYN_DUMMY_BODY + ' ' + match[1] + '>' + match[2] + '</div>';
		}
		return html;
	}

	/**
	 * 直下先頭要素に'data-h5-default-scene'もしくは'data-h5-scene'属性がない場合は、'data-h5-default-scene'のDIV要素で囲む。
	 * <p>
	 * その際、親(シーンコンテナ)側にdata-h5-controller属性がある場合は、シーン要素に移動する。
	 * </p>
	 *
	 * @private
	 * @param parent
	 */
	function wrapScene(parent) {
		var $parent = $(parent);
		var $children = $parent.children();
		if ($children.eq(0).is('[' + DATA_H5_DEFAULT_SCENE + '],[' + DATA_H5_SCENE + ']') === false) {
			$parent.wrapInner($('<div ' + DATA_H5_DEFAULT_SCENE + '></div>'));
			var name = $parent.attr(DATA_H5_CONTROLLER);
			if (name) {
				// TODO(鈴木) childrenは↑のwrapAllで作成した要素
				$parent.removeAttr(DATA_H5_CONTROLLER).children().attr(DATA_H5_CONTROLLER, name);
			}
		}
	}

	/**
	 * 先頭に表示文字列テキストノードがあるかのチェック用正規表現
	 */
	var startByTextRegexp = /^\s*(?!\s|<)/;

	/**
	 * HTML要素取得(通信)
	 * <p>
	 * 第二引数にコンテナ指定を追加。これが指定された場合、第一引数により取得したHTML内で、 data-h5-container属性の値がこれに一致する要素を対象とする。
	 * </p>
	 *
	 * @private
	 * @param source
	 * @param container
	 * @returns {Promise}
	 */
	function loadContentsFromUrl(source, container) {
		var dfd = h5.async.deferred();

		// TODO htmlだとスクリプトが実行されてしまうのでフルHTMLが返されるとよくない
		// 部分HTML取得の場合のことを考慮。
		var xhr = h5.ajax({
			url: source,
			dataType: 'html'
		});

		xhr
				.done(
						function(data) {

							// TODO(鈴木) ここでdataからbody部分のみ抜く。
							data = extractBody(data);

							// 先頭が表示文字列テキストノードの場合はコンテナ要素で囲む
							if (startByTextRegexp.test(data)) {
								data = '<div ' + DATA_H5_CONTAINER + '>' + data + '</div>';
							}

							var $dom = $(data);

							if (container) {
								var $container = findWithSelf($dom, '[' + DATA_H5_CONTAINER + '="'
										+ container + '"]');
								if ($container.length === 0) {
									// ロードしたHTML内に指定のコンテナが存在しない場合はエラー
									throwFwError(ERR_CODE_TARGET_CONTAINER_NOT_FOUND, [source,
											container]);
								}
								$dom = $container.eq(0);
							} else {
								// TODO(鈴木)
								// mainタグかdata-main-container属性要素があればその内容を対象とする。
								// 通常のシーンコンテナ内にmainとdata-main-containerはない前提。
								var main = findWithSelf($dom, '[' + DATA_H5_MAIN_CONTAINER + ']');
								// TODO(鈴木)
								// 現状のフラグに基づいて遷移先のHTMLからメインシーンコンテナに該当する部分を抽出。
								// さすがに遷移先HTMLでのフラグ状態までは見られない。。
								if (h5.settings.scene.autoCreateMainContainer) {
									if (main.length === 0)
										main = findWithSelf($dom, 'main');
								}
								if (main.length > 0) {
									$dom = main.eq(0);
									$dom.attr(DATA_H5_MAIN_CONTAINER, DATA_H5_MAIN_CONTAINER);
								}
							}

							// ルート要素が複数か、単一でもコンテナ要素、またはBODYのダミーでなければコンテナ要素で囲む
							if ($dom.length > 1
									|| (!isContainer($dom) && !$dom.is('[' + DATA_H5_DYN_DUMMY_BODY
											+ ']'))) {
								$dom = $('<div ' + DATA_H5_CONTAINER + '></div>').append($dom);
							}

							wrapScene($dom);

							dfd.resolve($dom.children());

						}).fail(function(error) {
					dfd.reject(error);
				});

		return dfd;
	}

	var NEW_SCENE_HTML = '<div class="h5-scene"></div>';

	/**
	 * HTML要素取得
	 *
	 * @private
	 * @param source
	 * @param container
	 * @returns {Promise}
	 */
	function loadContents(source, container) {
		var dfd;

		if (isString(source)) {
			dfd = loadContentsFromUrl(source, container);
		} else {
			dfd = h5.async.deferred();

			var contentsRoot;
			if (source == null) {
				// 新しくdiv要素を生成
				contentsRoot = $.parseHTML(NEW_SCENE_HTML);
			} else {
				// DOM要素が指定されたのでそれをそのまま使用
				contentsRoot = h5.u.obj.isJQueryObject(source) ? source[0] : source;
			}

			dfd.resolve(contentsRoot);
		}

		return dfd.promise();
	}

	// TODO(鈴木) シーンタイプ関連実装削除

	/**
	 * シーン遷移効果保持用オブジェクト
	 */
	var transitionTypeMap = {};

	/**
	 * シーン遷移効果登録
	 *
	 * @private
	 * @param type
	 * @param constructor
	 */
	function registerSceneTransition(type, constructor) {
		if (transitionTypeMap[type]) {
			//
		}
		transitionTypeMap[type] = constructor;
	}

	var DEFAULT_SCENE_TRANSITION_TYPE = 'default';

	/**
	 * デフォルトシーン遷移効果
	 *
	 * @private
	 * @class
	 */
	function defaultTransitionController() {
	//
	}
	$.extend(defaultTransitionController.prototype, {
		onChange: function(container, to) {
			var dfd = h5.async.deferred();
			$(container).empty();
			$(to).appendTo(container);
			dfd.resolve();
			return dfd.promise();
		},
		onChangeStart: function(container, from, to) {
			this._ind = h5.ui.indicator({
				target: container,
				block: true,
				message: '遷移中...'
			}).show();
		},
		onChangeEnd: function(container, from, to) {
			this._ind.hide();
		}
	});

	registerSceneTransition(DEFAULT_SCENE_TRANSITION_TYPE, defaultTransitionController);

	/**
	 * pushState関数
	 *
	 * @private
	 * @param state
	 * @param title
	 * @param url
	 */
	function pushState(state, title, url) {
		history.pushState(state, title, url);
	}

	/**
	 * メインシーンコンテナインスタンス保持用
	 */
	var mainContainer = null;

	/**
	 * changeSceneの遷移先指定コントローラーか否かを判断する正規表現
	 */
	var controllerRegexp = /Controller$/;

	/**
	 * シーンコンテナクラス
	 * <p>
	 * 実体はコントローラーです。 シーンコンテナを生成する場合はh5.scene.createSceneContainer()を使用してください。
	 * </p>
	 *
	 * @class
	 * @name SceneContainerController
	 */
	var SceneContainerController = {

		__name: 'h5.scene.SceneContainerController',

		/**
		 * メインシーンコンテナであるか否か
		 *
		 * @readOnly
		 * @type Boolean
		 * @memberOf SceneContainerController
		 */
		isMain: false,

		/**
		 * 画面遷移効果
		 *
		 * @private
		 * @memberOf SceneContainerController
		 */
		_transition: null,

		/**
		 * 現在表示しているシーンのコントローラー
		 *
		 * @private
		 * @memberOf SceneContainerController
		 */
		_currentController: null,

		/**
		 * リンククリックジャックによるシーン遷移の可否
		 *
		 * @private
		 * @memberOf SceneContainerController
		 */
		_isClickjackEnabled: false,

		/**
		 * シーン遷移時に使用するDeferredオブジェクト
		 *
		 * @private
		 * @memberOf SceneContainerController
		 */
		_dfd: null,

		/**
		 * changeScene経由で_changeSceneを実行したか否か
		 *
		 * @private
		 * @memberOf SceneContainerController
		 */
		_isNavigated: false,

		/**
		 * メインシーンコンテナでURLを連動せずにシーンを遷移する場合を識別するためのフラグ
		 * <p>
		 * 初期はtrueで連動せず。初期処理完了後にfalseにする。
		 * </p>
		 *
		 * @private
		 * @memberOf SceneContainerController
		 */
		_notPushState: true,

		/**
		 * __init
		 *
		 * @private
		 * @memberOf SceneContainerController
		 */
		__init: function(context) {

			var args = context.args || {};

			var element = this.rootElement;
			var isMain = args.isMain;
			/*var initialSceneInfo = args.initialSceneInfo;*/

			var that = this;

			this.isMain = !!isMain;

			if (this.isMain) {
				if (mainContainer) {
					// すでにメインシーンコンテナが生成されている場合にエラー
					throwFwError(ERR_CODE_MAIN_CONTAINER_ALREADY_CREATED);
				}
			}

			// TODO(鈴木) とりあえずデフォルトのtransitionを使用。
			this._transition = this._createTransition();
			this._transition.onChangeStart(element);

			this._containerName = $(element).attr(DATA_H5_MAIN_CONTAINER)
					|| $(element).attr(DATA_H5_CONTAINER);

			// TODO(鈴木) シーンコンテナ下はコントローラーを管理
			this._currentController = null;

			// TODO(鈴木) コンテナ内にシーン要素がなければ追加する
			wrapScene(element);

			this.on('{rootElement}', EVENT_SCENE_CHANGE_REQUEST, this
					.own(this._onSceneChangeRequest));


			var param = {};

			if (this.isMain) {

				mainContainer = this;

				this.on('{window}', 'popstate', this.own(this._onWindowPopstate));

				//_isClickjackEnabledがtrueの場合のみ有効。
				//TODO:フラグのセット方法
				if (this._isClickjackEnabled) {
					this.on('{a}', 'click', this.own(this._onAClick));
				}

				// TODO(鈴木) メインシーンコンテナの場合、URLパラメータを取得して使用。
				// onPopStateを呼んでしまうと余計にHTMLを取りに行くことになるので、直接_changeSceneをto=elementで呼び出す。
				// URLからのパラメーター取得は現状では無効とする。
				// param = toQueryParams((location.search ||
				// '').substring(1));
				param = {};

			}

			/*if(initialSceneInfo){
				this.changeScene(initialSceneInfo);
				// TODO(鈴木)  _currentControllerへの登録等は内部で行われるので後続処理は不要
			}else{
			*/
			// TODO(鈴木) カレントとなるシーンを探索してscan
			scanForContainer(element, null, param.args).done(function(controller) {
				that._currentController = controller;
				that._transition.onChangeEnd(that.rootElement, null, element);
				that._transition = null;
			});
			/*}*/

		},

		/**
		 * __dispose
		 *
		 * @private
		 * @memberOf SceneContainerController
		 */
		__dispose: function() {

			if (!isDisposing(this._currentController)) {
				this._currentController.dispose();
			}

			this._currentController = null;
			$(this.rootElement).empty();
		},

		/**
		 * クリックジャックによる遷移
		 *
		 * @private
		 * @memberOf SceneContainerController
		 * @param context
		 */
		_onAClick: function(context) {
			context.event.preventDefault();
			var href = context.event.originalEvent.target.href;
			this.changeScene(href);
		},

		/**
		 * 画面遷移時のpopState時のコールバック
		 * <p>
		 * メインシーンコンテナの場合のみ有効。
		 * </p>
		 *
		 * @private
		 * @memberOf SceneContainerController
		 * @param context
		 */
		_onWindowPopstate: function(context) {
			// TODO(鈴木) 現状はURLでパラメーター渡しはしない
			// var param = toQueryParams((location.search || '').substring(1));
			// this._changeScene(location.href, param);
			this._changeScene(location.href);
			// TODO(鈴木) hrefからparamに該当する部分を削除して使用したほうがよいか？
		},

		/**
		 * シーン遷移イベント発生時処理
		 *
		 * @private
		 * @memberOf SceneContainerController
		 * @param context
		 */
		_onSceneChangeRequest: function(context) {
			context.event.stopPropagation();
			setTimeout(this.own(function() {
				this.changeScene(context.evArg);
			}), 0);
		},

		/**
		 * シーンコンテナ内のシーンを遷移します。
		 * <p>
		 * 機能の詳細については以下を参照してください。
		 * </p>
		 * <ul>
		 * <li><a
		 * href="/conts/web/view/reference/scene-spec">リファレンス（仕様詳細)&gt;&gt;画面遷移制御・履歴管理(シーン機能)仕様
		 * [ver.1.2]</a>
		 * <ul>
		 * <li><a
		 * href="/conts/web/view/reference/scene-spec#H30B730FC30F330B330F330C630CA5185306E907779FB2830B730FC30F3306E907779FB29">
		 * シーンコンテナ内の遷移(シーンの遷移)</a></li>
		 * </ul>
		 * </li>
		 * </ul>
		 *
		 * @param {String|Object} param 遷移先文字列、または遷移用オプション。
		 *            <p>
		 *            遷移先文字列の場合は、HTMLを返却するURLか、コントローラーの__name属性を指定します。<br>
		 *            遷移用オプションの場合は、以下のプロパティを持ちます。
		 *            </p>
		 * @param {String} param.to 遷移先指定。HTMLを返却するURLか、コントローラーの__name属性を指定します。指定必須です。
		 * @param {String}[param.transition='default']
		 *            遷移効果指定。指定しない場合は'default'が使用されます。(現在、'default'以外は指定できません)
		 * @param {String}[param.container] toで指定される要素内の部分を表示する場合、その要素のdata-h5-container属性の値を指定します。
		 * @param {Any}[param.args] デフォルトシーンに対応するコントローラー生成時に渡されるパラメータを指定します。
		 * @returns {Promise} Promiseオブジェクト。遷移完了時にresolveを実行します。
		 * @memberOf SceneContainerController
		 */
		changeScene: function(param) {

			// TODO(鈴木) paramが文字列の場合は遷移先と見なして再帰呼び出しする
			if (isString(param)) {
				return this.changeScene({
					to: param
				});
			}

			param = $.extend(true, {}, param);

			var to = param.to;

			this._transition = this._createTransition(param.transition);

			// TODO(鈴木) シーンコンテナ下はコントローラーを管理
			var fromElm = (this._currentController || {}).rootElement;

			// TODO(鈴木) インジケーターは遷移処理発動直後に表示する必要がある(余計な操作をさせないため)
			// fromは設定しているが使っていない。toはここでは指定できない。
			this._transition.onChangeStart(this.rootElement, fromElm);

			var dfd = this._dfd = h5.async.deferred();

			// TODO(鈴木) changeScene経由で_changeSceneを実行したか否か
			this._isNavigated = true;

			if (this.isMain) {

				// TODO(鈴木) メインシーンコンテナで遷移先がHTML(コントローラーでない)の場合は
				// paramからtoを削除(URLに余計な情報を残さないため)
				if (!controllerRegexp.test(to)) {
					delete param.to;
				}

				if (!isString(to)) {
					// シーン遷移先に文字列以外を指定されたらエラー
					throwFwError(ERR_CODE_CHANGE_SCENE_TO_IS_NOT_STRING, [to]);
				}
				if (to.indexOf('#') !== -1) {
					// シーン遷移先にハッシュを指定されたらエラー
					throwFwError(ERR_CODE_CHANGE_SCENE_HASH_IN_TO, [to]);
				}
				if (controllerRegexp.test(to)) {
					// メインシーンコンテナで遷移先にコントローラーを指定されたらエラー(暫定)
					throwFwError(ERR_CODE_MAIN_CHANGE_SCENE_TO_IS_CONTROLLER, [to]);
				}

				/*if(this.isInit){ // TODO(鈴木) 初期表示シーンの場合はURL連動しない。*/
				// TODO(鈴木) パラメータをエンコードしてURLに付加
				// ※現在シリアライズ方式検討中のため、パラメータの付加はしない
				// to += ((to.indexOf('?') === -1) ? '?' : '&') +
				// $.param(param);
				pushState(null, null, toAbsoluteUrl(to));
				/*}*/

				// TODO(鈴木) URLから遷移したいが、↑のためパラメータが付加されていないので、
				// 直接_changeSceneを呼ぶ。
				// onPopState();
				this._changeScene(to, h5.u.obj.deserialize(h5.u.obj.serialize(param)));

			} else {
				this._changeScene(to, h5.u.obj.deserialize(h5.u.obj.serialize(param)));
			}

			return dfd.promise();
		},

		/**
		 * シーン遷移内部処理
		 *
		 * @private
		 * @memberOf SceneContainerController
		 * @param to
		 * @param param
		 */
		_changeScene: function(to, param) {

			param = param || {};

			// TODO(鈴木) シーンコンテナ下はコントローラーを管理
			var fromElm = (this._currentController || {}).rootElement;

			// changeSceneメソッド経由でない場合
			if (!this._isNavigated) {
				this._transition = this._createTransition(param.transition);
				this._transition.onChangeStart(this.rootElement, fromElm);
			}

			// 現在のページの全てのコントローラを削除
			if (fromElm) {
				disposeAllControllers(fromElm);
			}

			var that = this;

			// TODO(鈴木) transitionをコントローラーからFunctionに変更

			// TODO(鈴木) TransitionController変更に伴う変更
			// 次のコンテンツのロードはこちらで行う。
			// 将来、コントローラー・DOMを保存して使用する場合に、それらのハンドリングはシーンコンテナで行うほうがよいと思われるため。
			// 更にその先で、これらの処理も外部指定が可能なようにする。

			// TODO(鈴木) 処理順を以下に変更
			// HTMLロード→(ツリーにはappendせず)DOM生成→属性に基づきコントローラーをロード・バインド
			// →シーンルートとなるコントローラーのDOMを既存と入れ替える
			// (現状はコンテナ以下をそのまま入れている。コンテナ内にDOM的にシーンが複数あるケースは未対応)

			if (isString(to)) {

				if (controllerRegexp.test(to)) {

					// TODO(鈴木)
					loadController(to, $('<div></div>'), param.args).done(function(toController) {
						that._onLoadController(toController, fromElm);
					});

				} else {
					// TODO(鈴木) HTMLの対象部分抽出はloadContentsFromUrlに実装。
					// 1.2.0では、URLにパラメーターを保存しないため、メインシーンコンテナの場合はcontainer指定は無効とする
					var loadPromise = loadContents(to, (!this.isMain) ? param.container : null);

					loadPromise.done(
							function(toElm) {
								// TODO(鈴木) DATA属性に基づいてコントローラーバインド・コンテナ生成
								// TODO(鈴木) scan用にダミーのDIVにappend
								scanForContainer($('<div></div>').append(toElm), null, param.args)
										.done(function(toController) {
											that._onLoadController(toController, fromElm);
										});

							}).fail(function(xhr) {

						// シーン遷移先HTMLのロードに失敗
						throwFwError(ERR_CODE_HTML_LOAD_FAILED, [to], xhr);

					});
				}
			}

		},

		/**
		 * 遷移効果登録
		 *
		 * @private
		 * @memberOf SceneContainerController
		 * @param type
		 */
		_createTransition: function(type) {
			var Transition = transitionTypeMap[type != null ? type : DEFAULT_SCENE_TRANSITION_TYPE];

			if (!Transition) {
				// 指定された遷移効果が存在しない場合はエラー
				throwFwError(ERR_CODE_TRANSITION_NOT_FOUND, [type]);
			}

			return new Transition();
		},

		/**
		 * シーン遷移時コントローラーロード後処理
		 *
		 * @private
		 * @memberOf SceneContainerController
		 * @param toController
		 * @param fromElm
		 */
		_onLoadController: function(toController, fromElm) {

			var that = this;

			var toElm = toController.rootElement;

			this._transition.onChange(this.rootElement, toElm).done(function() {

				// TODO(鈴木) disposeのタイミングはどうすべきか・・

				if (this._dfd) {
					this._dfd.resolve({
						from: fromElm,
						to: toElm
					});
				}

				if (fromElm) {
					$(fromElm).remove();
				}

				that._currentController = toController;

				// TODO(鈴木) インジケータ非表示
				that._transition.onChangeEnd(that.rootElement, fromElm, toElm);

				that._isNavigated = false;
				that._dfd = null;
				that._transition = null;

			});
		}

	};

	/**
	 * シーンコンテナインスタンスを生成します.
	 *
	 * @memberOf h5.scene
	 * @param {Element} element シーンコンテナ生成対象要素。
	 * @param {Boolean} [isMain=false] メインシーンコンテナとするか否か。
	 *            <dl>
	 *            <dt>メインシーンコンテナとする
	 *            <dt>
	 *            <dd>true</dd>
	 *            <dt>メインシーンコンテナとしない</dt>
	 *            <dd>false(デフォルト)</dd>
	 *            </dl>
	 * @returns {SceneContainerController} 生成したシーンコンテナのインスタンス。
	 */
	function createSceneContainer(element, isMain/*, param*/) {

		// TODO(鈴木) 対象要素配下にコンテナ、またはコントローラーバインド済みの要素がある場合はエラーとすべき

		// TODO(鈴木) element指定なしの場合はdiv要素を作って設定
		if (element == null) {
			element = $('<div></div>').get(0);
		}

		// TODO(鈴木) コンテナ生成済みであればエラー。判定方法は見直しが必要か。
		if ($(element).is('[' + DATA_H5_DYN_CONTAINER_BOUND + ']')) {
			throwFwError(ERR_CODE_CONTAINER_ALREADY_CREATED);
		}

		if (isMain) {
			if ($(element).is(':not([' + DATA_H5_MAIN_CONTAINER + '])')) {
				$(element).attr(DATA_H5_MAIN_CONTAINER, DATA_H5_MAIN_CONTAINER);
			}
		} else {
			if ($(element).is(':not([' + DATA_H5_CONTAINER + '])')) {
				$(element).attr(DATA_H5_CONTAINER, DATA_H5_CONTAINER);
			}
		}

		var container = h5internal.core.controllerInternal(element, SceneContainerController, {
			isMain: isMain
		/*initialSceneInfo : param*/
		}, {
			async: false
		});

		$(element).attr(DATA_H5_DYN_CONTAINER_BOUND, DATA_H5_DYN_CONTAINER_BOUND);

		return container;
	}

	/**
	 * シーン機能の初回適用を行います。
	 * <p>
	 * ドキュメント全体に対し、DATA属性に基づいて、コントローラーのバインドとシーンコンテナの生成を行います。<br/> 2回目以降の実行は無視されます。
	 * </p>
	 *
	 * @memberOf h5.scene
	 */
	function init() {
		if (!isInited) {
			isInited = true;
			scan();
		}
	}

	/**
	 * メインシーンコンテナのインスタンスを取得します。
	 *
	 * @memberOf h5.scene
	 * @returns {SceneContainerController} メインシーンコンテナのインスタンス。未作成の場合はnull。
	 */
	function getMainContainer() {
		return mainContainer;
	}

	/**
	 * 指定要素およびその配下のシーンコンテナを取得します
	 *
	 * @memberOf h5.scene
	 * @param {Element} [rootElement=document.body] 走査先頭要素。指定しない場合はドキュメント全体を対象とします。
	 * @returns {SceneContainerController[]} シーンコンテナの配列。
	 */
	function getAllSceneContainers(rootElement) {

		var containers = h5.core.controllerManager.getControllers(rootElement || document.body, {
			name: SceneContainerController.__name,
			deep: true
		});

		return containers;

	}

	/**
	 * シーンコンテナを取得します。
	 *
	 * @memberOf h5.scene
	 * @param {String|Element} nameOrElement 文字列、要素が指定できます。
	 *            <dl>
	 *            <dt>文字列の場合</dt>
	 *            <dd>取得対象とする要素のdata-h5-container属性まはたdata-h5-main-container属性の値とみなし、その要素に対応するシーンコンテナを返却します。</dd>
	 *            <dt>要素の場合</dt>
	 *            <dd>その要素に対応するシーンコンテをを返却します。</dd>
	 *            </dl>
	 *            <p>
	 *            いずれの場合も、該当がない場合はnullを返却します。
	 *            </p>
	 * @returns {SceneContainerController} シーンコンテナ
	 */
	function getSceneContainer(nameOrElement) {

		if (nameOrElement == null)
			return null;


		var name = null, element = null;

		if (isString(nameOrElement)) {
			name = nameOrElement;
		} else {
			element = nameOrElement;
		}

		var containers = getAllSceneContainers(element);

		if (containers.length === 0) {
			return null;
		}

		if (name) {
			for (var i = 0; i < containers.length; i++) {
				if (containers[i]._containerName === name) {
					return containers[i];
				}
			}
			return null;
		}

		return containers[0];

	}

	// =============================
	// Code on boot
	// =============================

	// フック
	h5internal.core.addControllerInstantiationHook(function(c) {
		// TODO controllerがすでにsceneプロパティを持っていたらエラーでよいか
		c.scene = new Scene(c);
	});

	// TODO autoInitがtrueの場合のみinit
	// TODO(鈴木) 暫定。とりあえず設定を有効化しました
	h5.settings.scene = h5.settings.scene || {};
	$(function() {
		// TODO(鈴木) autoInit=trueの場合に全体を探索し、DATA属性によりコントローラーバインドとシーンコンテナ生成を行う。
		if (h5.settings.scene.autoInit) {
			init();
		}
	});

	// =============================
	// Expose to window
	// =============================
	/**
	 * @namespace
	 * @name scene
	 * @memberOf h5
	 */
	h5.u.obj.expose('h5.scene', {
		openWindow: openWindow,
		createSceneContainer: createSceneContainer,
		init: init,
		getMainContainer: getMainContainer,
		scan: scan,
		getAllSceneContainers: getAllSceneContainers,
		getSceneContainer: getSceneContainer
	});

})();

	/* del begin */
	var fwLogger = h5.log.createLogger('h5');
	fwLogger.info('開発版のhifive(ver.{0})の読み込みが完了しました。リリース時はMinify版（h5.js）を使用してください。', h5.env.version);
	fwLogger.info('hifive内部で使用されるjQueryのバージョン：{0}', $.fn.jquery);
	/* del end */

})(jQuery);
