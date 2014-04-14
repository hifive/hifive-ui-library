(function() {
	// 二重読み込み防止
	if (h5.u.obj.ns('h5.ui.container').ApplicationController) {
		return;
	}

	/** レスポンスHTMLをバインドするターゲットに指定する属性名 */
	var ATTR_BIND_TARGET = 'h5-bind-target';

	/** ATTR_BIND_TARGETに指定する属性値 */
	var INSERT_METHOD_UPDATE = 'update';
	var INSERT_METHOD_APPEND = 'append';
	var INSERT_METHOD_PREPEND = 'prepend';

	/** フォームサブミットを同時に行うグループを指定する属性名 */
	var ATTR_REFRESH_GROUP = 'h5-refresh-group';

	/** フォームサブミット時にブロックするグループを指定する属性名 */
	var ATTR_BLOCK_GROUP = 'h5-block-group';

	/** フォームサブミット時にbodyをブロックしたいときにATTR_BLOCK_TARGETに指定するキーワード */
	var BLOCK_SCREEN = 'screen';

	/** フォームサブミット時にformをブロックしないときにATTR_BLOCK_TARGETに指定するキーワード */
	var BLOCK_NONE = 'none';

	/** レスポンスHTML内でプレースホルダ指定するデータ名 */
	var ATTR_MIGRATION = 'h5-migration';

	/** データバインド指定 */
	var DATA_H5_BIND = 'data-h5-bind';

	/** submit中かどうかのフラグ。二重送信防止用 */
	var SUBMIT_FLAG = 'h5-submit-flag';

	/**
	 * アプリケーションコントローラ formを含む要素をラップし、自動更新機能を追加する
	 *
	 * @name h5.ui.container.ApplicationController
	 * @class
	 */
	var applicationController = {
		__name: 'h5.ui.container.ApplicationController',

		/**
		 * 二重送信防止用のフラグ
		 */
		submitFlag: false,

		'form submit': function(context, $form) {
			this._submit(context, $form);
		},

		/**
		 * トリガでsubmitしたいときに呼ぶイベント
		 * <p>
		 * このコントローラがバインドされているフォームだけトリガしてsubmitしたいときは、 'h5-submit'をトリガする
		 * </p>
		 */
		'form h5-submit': function(context, $target) {
			this._submit(context, $target, true);
		},

		_submit: function(context, $form, isTrigger) {
			var event = context.event;
			event.preventDefault();
			event.stopPropagation();

			// 二重送信防止
			if ($form.data(SUBMIT_FLAG)) {
				return;
			}
			$form.data(SUBMIT_FLAG, true);

			// 更新を適用するフォーム
			var $targetForm = $form;
			var target = $form.attr('target');
			if (target) {
				$targetForm = $('form[name="' + target + '"]');
				if (!$targetForm.length) {
					this.log.error('target属性に指定されたnameを持つformが見つかりませんでした。処理を中断します。');
					return;
				}
			}

			// actionに指定されたurlを取得
			var url = $form.attr('action');

			// formのデータを取得
			var data = $form.serialize();
			this.log.debug(data);

			// methodを取得
			var method = $form.attr('method') || 'POST';

			// 同時にsubmitするグループ名
			var refreshGroup = $form.attr(ATTR_REFRESH_GROUP);

			// 同時にブロックするターゲット
			var blockTarget = $form.attr(ATTR_BLOCK_GROUP);
			var $indicatorTarget = null;

			// 同じblock-groupが指定されている要素に対してインジケータを出す。
			// 指定無しならform、allならbody、noneなら出さない。
			if (!blockTarget) {
				$indicatorTarget = $targetForm;
			} else if (blockTarget === BLOCK_SCREEN) {
				$indicatorTarget = $(document.body);
			} else if (blockTarget !== BLOCK_NONE) {
				$indicatorTarget = $(h5.u.str.format('[{0}="{1}"]', ATTR_BLOCK_GROUP, blockTarget));
			}

			// indicator
			var indicator = null;
			if ($indicatorTarget && $indicatorTarget.length) {
				indicator = this.indicator({
					target: $indicatorTarget
				}).show();
			}

			// 同じグループのformのsubmitをトリガする
			// トリガで呼ばれた場合は、他のformはトリガ済みなので何もしない
			if (!isTrigger && refreshGroup) {
				$(h5.u.str.format('form[{0}="{1}"]', ATTR_REFRESH_GROUP, refreshGroup)).not($form)
						.trigger('h5-submit');
			}

			// ajaxでデータを送信
			var that = this;
			this.log.debug(method);

			var p = h5.ajax(url, {
				data: data,
				method: method
			});

			// インジケータ動作確認用に1500ms秒ウェイトしている
			setTimeout(function() {
				p.always(function() {
					// インジケータを消す
					indicator && indicator.hide();
					$form.data(SUBMIT_FLAG, false);
				}).done(
						function(data) {
							// 成功時の動作
							switch (this.dataTypes.join('/')) {
							case 'text/html':
								// 文字列の場合は、受け取った文字列でformを差し替える
								var $data = $($.trim(data));
								var $wrapData = $('<div>').append($data);
								// 取得した要素からdata-h5-migrationの指定されているものを取得
								var $migrations = $wrapData.find('[' + ATTR_MIGRATION + ']');

								// 各migration指定の要素について置換する
								$migrations.each(function() {
									var $migration = $(this);
									var $placeholder = $targetForm.find($($(this).attr(
											ATTR_MIGRATION)));
									if ($placeholder.length) {
										// h5-migrationと差し替え
										// (複数個所に同じ要素を指定されても、複数バインドできるようにclone()する)
										$migration.after($placeholder.clone());
										$migration.remove();
									} else {
										that.log.debug(ATTR_MIGRATION + 'で指定されたセレクタに該当する要素がありません');
									}
								});

								// h5-bind-targetがあれば、そこに差し替える
								var $bindTarget = $targetForm.find('[' + ATTR_BIND_TARGET + ']');
								if ($bindTarget.length) {
									$bindTarget.each(function() {
										switch ($(this).attr(ATTR_BIND_TARGET)) {
										case INSERT_METHOD_APPEND:
											// 複数個所に同じ要素をバインドできるようにclone()
											$(this).append($data.clone());
											break;
										case INSERT_METHOD_PREPEND:
											$(this).prepend($data.clone());
											break;
										case INSERT_METHOD_UPDATE:
											$(this).html($data.clone());
											break;
										default:
											that.log.debug(
													'{0}属性の値が不正です。{1},{2},{3}のいずれかを指定してください',
													ATTR_BIND_TARGET, INSERT_METHOD_APPEND,
													INSERT_METHOD_PREPEND, INSERT_METHOD_UPDATE);
										}
									});
									return;
								}
								// h5-bind-targetがないならformと差し替える。
								// $targetForm及びその子要素にバインドされているコントローラがあればそれもアンバインド
								for ( var controllers = h5.core.controllerManager.getControllers(
										$targetForm, {
											deep: true
										}), i = controllers.length - 1; i > -1; i--) {
									controllers[i].dispose();
								}

								// formと受け取ったhtmlを入れ替え
								// (htmlをformの直後に挿入して、formを削除)
								$targetForm.after($data);
								$targetForm.remove();
								return;
							case 'text/json':
								// jsonの場合はデータバインド。
								// ※(dataTypeはcontentTypeと違い、application/jsonではない。文字列なら必ずtext。dataTypeはjQueryが入れいているもの。)
								if ($targetForm.find('[' + DATA_H5_BIND + ']').length) {
									h5.core.view.bind($targetForm, data).unbind();
								}
							}
						}).fail(function(jqXHR, textStatus, errorThrown) {
					// failHandlerを実行
					that.failHandler.call(this, jqXHR, $form, that);
				});
			}, 1500);
		},

		/**
		 * デフォルトのfailHandler
		 *
		 * @memberOf h5.ui.container.ApplicationController
		 * @param jqXHR
		 * @param $form
		 */
		_defaultFailHandler: function(jqXHR, $form, controller) {
			// ログを表示
			controller.log.error('formの送信に失敗しました。{0} {1} URL:{2}', jqXHR.status, jqXHR.statusText,
					this.url);

			if ($('.h5-alert').length) {
				return;
			}
			var $h5Alert = $('<div class="h5-alert"><span class="msg"></span><a class="close-btn">×</a><div class="response"></div></div>');
			var $body = $('body');
			$body.append($h5Alert);
			$h5Alert.css('width', $body.width() - parseInt($h5Alert.css('margin-left'))
					- parseInt($h5Alert.css('margin-right')));


			switch (this.dataTypes.join('/')) {
			case 'text/html':
				$res = $(jqXHR.responseText);
				// styleタグは削除する(レイアウト崩れないようにするため)
				$h5Alert.find('.response').append($res).find('style').remove();
				break;
			case 'text':
			case 'text/plain':
			case 'text/json':
				var message = h5.u.str.format('formの送信に失敗しました。{0} {1} URL:{2}', jqXHR.status,
						jqXHR.statusText, this.url);
				$h5Alert.find('.msg').text(message);
				if (jqXHR.responseText) {
					$h5Alert.find('.response').text(jqXHR.responseText);
				} else {
					$h5Alert.find('.response').css('display', 'none');
				}
			}

			$('.h5-alert .close-btn').bind('click', function() {
				$('.h5-alert').remove();
			});
		},

		/**
		 * failHandler
		 *
		 * @memberOf h5.ui.container.ApplicationController
		 * @param jqXHR
		 * @param $form
		 */
		failHandler: function(jqXHR, $form, controller) {
			controller._defaultFailHandler.call(this, jqXHR, $form, controller);
		}
	};

	h5.core.expose(applicationController);

})();