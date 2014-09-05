$(document).bind('h5preinit', function() {
	h5.settings.log = {
		target: {
			toElement: {
				type: {
					/**
					 * ログの出力先(init内で設定)
					 */
					_$target: null,

					/**
					 * ロガーの初期化処理
					 */
					init: function() {
						// ログ出力先要素を、initのタイミングで生成する
						var $target = $('<div class="logTargetElement"><pre>デバッグ情報</pre></div>');
						$(function() {
							$('body').append($target);
						});
						this._$target = $target;
					},

					/**
					 * ログの出力処理
					 */
					log: function(logObj) {
						// ログメッセージの作成
						var args = logObj.args;
						var msg = h5.u.str.format.apply(this, args);
						// エレメントの作成
						var $line = this._createLine(msg, logObj.levelString);
						// 出力先に追加
						this._$target.append($line);
					},

					/**
					 * ログメッセージのp要素作成
					 *
					 * @private
					 */
					_createLine: function(msg, level) {
						// クラスにログレベルを設定、またメッセージをエスケープをしてp要素を作成して返す
						var cls = level.toLowerCase();
						var escapedMsg = h5.u.str.escapeHtml(msg);
						return $('<pre class="' + cls + '">' + escapedMsg + '</pre>');
					}
				}
			}
		},
		// *Controllerのロガーと、エラーはconsoleによる出力とtoElementによる出力が行われる
		out: [{
			category: '*Controller',
			level: 'all',
			targets: ['console', 'toElement']
		}, {
			category: '*',
			level: 'error',
			targets: ['console', 'toElement']
		}]
	};

	var commonLogger = h5.log.createLogger('common');
	window.onerror = function(e) {
		commonLogger.error(e);
	};
});