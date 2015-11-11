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
 */
(function() {
	/** くっつく距離 */
	var MAGNET_DIST = 30;

	/** グループ化の時に表示するbox-shadowのスタイル */
	var SHADOW_STYLE = '0 0 50px #0f0';

	/** box-shadowを表示する時間(ms) 'fast'などjQuery.animateで指定可能な文字列も指定可能 */
	var SHADOW_DURATION = 500;

	/** マグネットコンテナのロケールを保持する属性名。ロケールが等しい、または未指定同士の場合のみくっつき、ロケールが違う者同士はくっつかない。 */
	var DATA_MAG_LAYER_ID = 'data-h5mag-layer-id';

	/**
	 * くっつく場所の定数
	 */
	var MAGNET_PLACE = {
		NONE: 0,
		TOP: 1,
		RIGHT: 2,
		BOTTOM: 3,
		LEFT: 4,
		PILED: 5
	};

	/**
	 * コントローラ
	 *
	 * @name h5.ui.components.MagnetContainer.MagnetController
	 */
	var controller = {
		/**
		 * 設定項目
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 */
		config: {
			/**
			 * マグネットコンテナの対象外にする要素。$().is(ignorePatter)で判定するため、セレクタもDOM要素も指定可能
			 */
			ignorePattern: null,

			/**
			 * コンテナにくっついている要素に重なるようにドラッグした時に入れ替えを行うかどうか。
			 * <p>
			 * デフォルトfalse。入れ替えを行わない場合は、既にくっついている場所にはくっつかない。
			 * </p>
			 */
			replaceMode: false,

			/**
			 * コンテナにくっついている要素に重なるようにドラッグした時に重ねるかどうか
			 * <p>
			 * replaceModeの設定より優先される
			 * </p>
			 */
			pileMode: true
		},
		/**
		 * コントローラ名
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 */
		__name: 'h5.ui.components.MagnetContainer.MagnetController',

		/**
		 * くっついた時のアニメーション再生中かどうか
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 */
		isAnimating: false,

		/**
		 * くっついている間に移動した量
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 */
		storeEvent: {
			x: 0,
			y: 0
		},
		/**
		 * くっつける時に移動した量
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 */
		storeMagnetDist: {
			x: 0,
			y: 0
		},

		/**
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param context
		 */
		__ready: function(context) {
			// rootElement直下の要素であっても、コンテナとして扱わない要素(selectorやDOMなど$().isで判定できるもの)を登録
			// (context.evArgで渡した場合はここで設定するが、バインド済みのコントローラに設定してもよい)
			if (context.evArg && context.evArg.ignorePattern) {
				this.ignorePattern = context.evArg.ignorePattern;
			}
		},

		/**
		 * コンテナドラッグ開始
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param context
		 * @param $target
		 */
		'>div h5trackstart': function(context, $target) {
			if ($target.hasClass('h5mag-groupContainer') || $target.is(this.ignorePattern)) {
				return;
			}
			var isTrigger = context.evArg && context.evArg.triggerForGroupCheck;
			var event = context.event;
			event.preventDefault();
			event.stopPropagation();
			var pos = $target.position();
			var dragInfo = {};

			$target.data('h5mag-draginfo', dragInfo);
			if (!isTrigger) {
				// イベントを上げる
				$target.trigger('h5mag-trackstart', event);
				// position:absoluteに変更
				if ($target.css('position') !== 'absolute') {
					$target.css({
						top: parseInt(pos.top),
						left: parseInt(pos.left),
						position: 'absolute'
					});
				}
				// 元あった場所を覚えておく。
				// 他の要素と入れ替えがあった時に、ドラッグ中の要素が元あった場所と入れ替えるため
				dragInfo.originalPos = {
					left: pos.left,
					top: pos.top
				};
			}

			// 自分以外のコンテナの位置と大きさを取得してキャッシュしておく。
			// move時の隣接判定ではキャッシュした情報を使うようにする(高速化のため)
			var containerMapList = [];
			var that = this;
			// ロケールの取得
			var layer = $target.attr(DATA_MAG_LAYER_ID);
			$(this.rootElement.children).each(
					function() {
						var $this = $(this);
						if ($this.hasClass('h5mag-groupContainer') || $target.is(this)
								|| $this.is(that.ignorePattern)
								|| $this.attr(DATA_MAG_LAYER_ID) !== layer) {
							// グループ要素、ターゲット自身、ignorePattern、ロケール違いの場合はくっつく対象にならない
							return;
						}
						var pos = $this.position();
						var height = $this.height();
						var width = $this.width();
						containerMapList.push({
							$container: $this,
							top: pos.top,
							left: pos.left,
							height: height,
							width: width
						});
					});

			dragInfo.containerMapList = containerMapList;

			this.storeMagnetDist.x = 0;
			this.storeMagnetDist.y = 0;
			this.storeEvent.x = 0;
			this.storeEvent.y = 0;

			$target.addClass('magnetDragging');
		},
		/**
		 * コンテナドラッグ
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param context
		 * @param $target
		 */
		'>div h5trackmove': function(context, $target) {
			if ($target.hasClass('h5mag-groupContainer') || $target.is(this.ignorePattern)) {
				return;
			}
			var event = context.event;
			event.preventDefault();
			event.stopPropagation();

			var isTrigger = context.evArg && context.evArg.triggerForGroupCheck;
			// トリガされたものじゃないならイベントを上げる
			if (!isTrigger) {
				$target.trigger('h5mag-trackmove', event);
			}

			// triggerされたときはundefinedなので0に差し替え
			var eventX = event.dx || 0;
			var eventY = event.dy || 0;

			var dragInfo = $target.data('h5mag-draginfo');
			dragInfo.isMoved = true;
			var containerMapList = dragInfo.containerMapList;
			// くっつくくらい近いのがあればくっつける
			var result = this._getNearTarget($target, this.storeEvent.x + eventX, this.storeEvent.y
					+ eventY, containerMapList);

			var dist = result.dist;
			if (result.count) {
				if (dragInfo.isMagnetting) {
					// 引き続きくっついている場合、移動量だけ覚えておいて何もしない
					this.storeEvent.x += eventX;
					this.storeEvent.y += eventY;
				} else {
					// 今新たにくっついた場合
					this.storeEvent = {
						x: eventX,
						y: eventY
					};
					this.storeMagnetDist.x = dist.x + eventX;
					this.storeMagnetDist.y = dist.y + eventY;

					// くっつくように移動
					this._moveTarget($target, {
						dx: this.storeMagnetDist.x,
						dy: this.storeMagnetDist.y
					});

					// h5trackendで結果を使用するため、$targetに覚えさせておく。
					dragInfo.magnetResult = result;
					dragInfo.isMagnetting = true;

					// 既にその場所にくっついているものがあったら、場所を移動
					var $already = result.$already;
					if ($already && this.config.replaceMode) {
						var originalPos = dragInfo.originalPos;
						$already.css({
							top: originalPos.top,
							left: originalPos.left
						});
						var targetPos = $target.position();
						dragInfo.originalPos = {
							top: targetPos.top,
							left: targetPos.left
						};
						// グループから$ターゲットを引きはがす
						this._removeTargetFromMagnetGroup($already.attr('data-h5mag-group-id'),
								$already);

						// 入れ替えのあったコンテナについて、h5trackstart/endを呼び、グループ化の計算をさせる
						if (this.config.replaceMode) {
							var evArg = {
								triggerForGroupCheck: true
							};
							$already.trigger('h5trackstart', evArg);
							$already.trigger('h5trackmove', evArg);
							$already.trigger('h5trackend', evArg);
						}
						// キャッシュした位置情報の再計算
						for ( var i = 0, l = containerMapList.length; i < l; i++) {
							var $container = containerMapList[i].$container;
							if ($container.is($already)) {
								var map = containerMapList[i];
								var pos = $already.position();
								map.top = pos.top;
								map.left = pos.left;
							}

						}

					}
				}
			} else if (dragInfo.isMagnetting) {
				// くっついていたけど離れた場合
				// くっついていた間に移動した分と、くっつくときに動いた分、と今回のイベントの分、移動する。

				this._moveTarget($target, {
					dx: this.storeEvent.x - this.storeMagnetDist.x + eventX,
					dy: this.storeEvent.y - this.storeMagnetDist.y + eventY
				});

				// アニメーションを停止
				this._stopChainAnimate($target);

				this.storeEvent.x = 0;
				this.storeEvent.y = 0;
				this.storeMagnetDist.x = 0;
				this.storeMagnetDist.y = 0;
				dragInfo.isMagnetting = false;

				// グループから$ターゲットを引きはがす
				var $removeChildren = this._removeTargetFromMagnetGroup($target
						.attr('data-h5mag-group-id'), $target);

				// 離れたらイベントを上げる
				// TODO 元々くっついていた場所、グループなどをイベントに入れる
				$target.trigger('unmagnet', $removeChildren);
			} else {
				// くっついていない場合
				dragInfo.isMagnetting = false;
				this._moveTarget($target, {
					dx: eventX,
					dy: eventY
				});
			}
		},
		/**
		 * コンテナドラッグ終了
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param context
		 * @param $target
		 */
		'>div h5trackend': function(context, $target) {
			if ($target.hasClass('h5mag-groupContainer') || $target.is(this.ignorePattern)) {
				return;
			}
			var event = context.event;
			event.preventDefault();
			event.stopPropagation();

			// リセット
			$target.removeClass('magnetDragging');
			// $target.css('z-index', 1);
			this.storeEvent.x = 0;
			this.storeEvent.y = 0;
			this.storeMagnetDist.x = 0;
			this.storeMagnetDist.y = 0;

			var dragInfo = $target.data('h5mag-draginfo');
			$target.data('h5mag-draginfo', null);

			var isTrigger = context.evArg && context.evArg.triggerForGroupCheck;

			if (!dragInfo.isMoved) {
				// 動いていないなら何もしない
				return;
			}

			// ターゲットが属していたグループを削除
			// (入れ替え時に作られたグループで$targetが属してしまった場合)
			this._removeMagnetGroup($target.attr('data-h5mag-group-id'));

			if (dragInfo && dragInfo.isMagnetting) {
				// くっついた方向にくっついたコンテナを覚えさせておく
				var $attachContainers = null;
				var magnetResult = dragInfo.magnetResult;
				if (magnetResult[MAGNET_PLACE.PILED]) {
					// TODO 挙動を設定もしくはイベントハンドラの戻り値で変えられるようにする
					// 重なった時は、重ねられた要素のグループは変更せず、動かした方の要素もグループに属させない
					// イベントを上げる
					if (!isTrigger) {
						this._chainAnimate($target).done(function() {
							$target.trigger('piled', {
								$target: $target,
								$piled: magnetResult[MAGNET_PLACE.PILED]
							});
						});
					}
				} else {
					for ( var place = MAGNET_PLACE.TOP, l = MAGNET_PLACE.PILED; place <= l; place++) {
						var $adj = magnetResult[place];
						if ($adj) {
							$attachContainers = $attachContainers ? $attachContainers.add($adj)
									: $adj;
							$target.data('h5mag-adj-' + place, $adj);
							$adj.data('h5mag-adj-' + ((place + 1) % 4 + 1), $target);
							// くっついたコンテナが既存のグループに属していればそれを削除
							this._removeMagnetGroup($adj.attr('data-h5mag-group-id'));
						}
					}

					// 新しくグループの作成
					$groupChildren = this._createMagnetGroup($target);
					// くっついた時のアニメーションを実行
					this
							._chainAnimate($target)
							.done(
									function() {
										// アニメーションが終わってからくっついたイベントを上げる
										for ( var place = MAGNET_PLACE.TOP, l = MAGNET_PLACE.LEFT; place <= l; place++) {
											var $adj = magnetResult[place];
											if ($adj) {
												$adj.trigger('magnet', {
													$target: $target,
													place: place,
													$group: $groupChildren,
													MAGNET_PLACE: MAGNET_PLACE
												});
											}
										}
									});
				}
			}

			// イベントを上げる
			if (!isTrigger) {
				$target.trigger('h5mag-trackend', event);
			}
		},

		/**
		 * グループドラッグ開始
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param context
		 * @param $target
		 */
		'.h5mag-groupContainer h5trackstart': function(context, $target) {
			var event = context.event;
			event.preventDefault();
			event.stopPropagation();

			// イベントを上げる
			$target.trigger('h5mag-trackstart', event);
			// TODO グループで連結
		},

		/**
		 * グループドラッグ
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param context
		 * @param $target
		 */
		'.h5mag-groupContainer h5trackmove': function(context, $target) {
			var event = context.event;
			event.preventDefault();
			event.stopPropagation();

			// イベントを上げる
			$target.trigger('h5mag-trackmove', event);

			var groupId = $target.data('h5mag-group-id');
			var dx = event.dx;
			var dy = event.dy;
			var $groupElements = this.$find('[data-h5mag-group-id="' + groupId + '"]');
			$groupElements.each(function() {
				var $this = $(this);
				var pos = $this.position();
				$this.css({
					top: pos.top + dy,
					left: pos.left + dx
				});
			});

			// TODO グループで連結
		},

		/**
		 * グループドラッグ終了
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param context
		 * @param $target
		 */
		'.h5mag-groupContainer h5trackend': function(context, $target) {
			var event = context.event;
			event.preventDefault();
			event.stopPropagation();
			// イベントを上げる
			$target.trigger('h5mag-trackend', event);
			// TODO グループで連結
		},

		/**
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param context
		 * @param $target
		 */
		'>div magnet': function(context, $target) {
		// くっついたイベント
		},

		/**
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param context
		 * @param $target
		 */
		'>div unmagnet': function(context, $target) {
		// はなれたイベント
		},

		/**
		 * ターゲットの移動
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param $target
		 * @param dPos
		 */
		_moveTarget: function($target, dPos) {
			var pos = $target.position();
			$target.css({
				left: pos.left + dPos.dx,
				top: pos.top + dPos.dy
			});
		},

		/**
		 * くっつくくらい近いターゲットを返す
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param $target
		 * @param moveX 現在の$targetのx座標にmoveXの値を加えて計算
		 * @param moveY 現在の$targetのy座標にmoveYの値を加えて計算
		 * @param containerMapList 判定対象のコンテナの位置情報の配列
		 * @returns {Object} {count:くっつく数, [1～4]: くっつく対象(jQuery)}
		 */
		_getNearTarget: function($target, moveX, moveY, containerMapList) {
			// 複数にくっつく場合は複数要素列挙する。
			// (複数にくっつく===ret.distが全く同じな複数方向へのくっつきがある)
			var position = $target.position();
			var x = position.left + moveX;
			var y = position.top + moveY;
			var ret = {
				count: 0
			};
			var detectionDist = MAGNET_DIST;
			for ( var i = 0, l = containerMapList.length; i < l; i++) {
				var $container = containerMapList[i].$container;
				var map = containerMapList[i];

				// x軸の差
				var dx = map.left - x;
				// y軸の差
				var dy = map.top - y;

				var place = MAGNET_PLACE.NONE;

				if (Math.abs(dx) <= detectionDist && Math.abs(dy) <= detectionDist) {
					// 重なった場合
					// $targetと同じ位置にくっつく
					place = MAGNET_PLACE.PILED;
					if (!ret.dist) {
						ret.dist = {
							x: dx,
							y: dy
						};
					}
				} else if (Math.abs(dx) <= detectionDist) {
					// 縦にくっつくかどうかの判定
					if (dy < 0 && Math.abs(map.height + dy) <= detectionDist) {
						// $targetの上と$containerの下がくっつく
						place = MAGNET_PLACE.TOP;
						if (!ret.dist) {
							ret.dist = {
								x: dx,
								y: map.height + dy
							};
						}
					} else if (dy >= 0 && Math.abs(dy - $target.height()) <= detectionDist) {
						// $targetの下と$containerの上がくっつく
						place = MAGNET_PLACE.BOTTOM;
						if (!ret.dist) {
							ret.dist = {
								x: dx,
								y: dy - map.height
							};
						}
					}
				} else if (Math.abs(dy) <= detectionDist) {
					// 横にくっつくかどうかの判定
					if (dx < 0 && Math.abs(map.width + dx) <= detectionDist) {
						// $targetの左と$containerの右がくっつく
						place = MAGNET_PLACE.LEFT;
						if (!ret.dist) {
							ret.dist = {
								x: map.width + dx,
								y: dy
							};
						}
					} else if (dx >= 0 && Math.abs(dx - $target.width()) <= detectionDist) {
						// $targetの右と$containerの左がくっつく
						place = MAGNET_PLACE.RIGHT;
						if (!ret.dist) {
							ret.dist = {
								x: dx - map.width,
								y: dy
							};
						}
					}
				}
				if (place) {
					// 既にその場所にくっついている要素を取得
					// 重ねる時は、いくつでも重なっていいのでこの判定はしない(重ねるモードの時は入れ替えも起きない)
					if (!ret.$already && !this.config.pileMode) {
						var $already = $container.data('h5mag-adj-' + ((place + 1) % 4 + 1));
						if ($already && $already[0] !== $target[0]) {
							ret.$already = $already;
						}
					}

					if (ret.$already && !this.config.replaceMode) {
						// 既にその場にくっついている要素がある場合で入れ替えモードでない場合は、そこにはくっつかない。
						// (入れ替えモードでない場合は既にある場所とはくっつかない)
						continue;
					}
					// くっつく場所が見つかったら、くっつけるように移動した時に他にもくっつくかどうかを探索する。
					// x,yを移動して、距離を０にして探索。
					if (!ret.count) {
						x += ret.dist.x;
						y += ret.dist.y;
						detectionDist = 0;
					}
					ret.count++;

					// 結果の格納
					ret[place] = $container;
				}
			}
			return ret;
		},

		/**
		 * $targetから連結するすべてのコンテナを取得
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param $target
		 */
		_enumerate: function($target) {
			var $groupElements = null;
			function enumerate($elm) {
				for ( var place = MAGNET_PLACE.TOP, l = MAGNET_PLACE.LEFT; place <= l; place++) {
					var $adj = $elm.data('h5mag-adj-' + place);
					if ($adj) {
						if ($groupElements && $groupElements.filter($adj).length) {
							continue;
						}
						$groupElements = $groupElements ? $groupElements.add($adj) : $adj;
						enumerate($adj);
					}
				}
			}
			enumerate($target);
			return $groupElements;
		},

		/**
		 * $targetが連結しているコンテナについて、グループを作成
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param var_args 可変長のjQueryオブジェクト
		 */
		_createMagnetGroup: function($target) {
			var $groupChildren = this._enumerate($target);
			var oldGroupIds = [];
			if ($groupChildren) {
				$groupChildren.each(function() {
					var $this = $(this);
					// position:absoluteに変更
					if ($this.css('position') !== 'absolute') {
						var pos = $this.position();
						$this.css({
							top: parseInt(pos.top),
							left: parseInt(pos.left),
							position: 'absolute'
						});
						if (!$this.css('z-index')) {
							$this.css('z-index', 1);
						}
					}

					var groupId = $this.attr('data-h5mag-group-id');
					if (groupId && $.inArray(groupId, oldGroupIds) !== -1) {
						oldGroupIds.push(groupId);
					}
				});
				for ( var i = 0, l = oldGroupIds.length; i < l; i++) {
					this._removeMagnetGroup(oldGroupIds[i]);
				}
			}

			if (!$groupChildren) {
				return;
			}

			var groupId = new Date().getTime();

			// data-h5mag-group-id属性にgroupIdを追加
			$groupChildren.attr('data-h5mag-group-id', groupId);

			// グループの要素を覆う四角形の座標を取得
			var wrapperRect = this._getWrapperRect($groupChildren);

			// グループを動かすハンドル要素の追加
			this._addGroupWrap(wrapperRect.top, wrapperRect.left, groupId, wrapperRect, $target
					.attr(DATA_MAG_LAYER_ID));

			return $groupChildren;
		},
		/**
		 * 連結解除されたコンテナについて、コンテナの連結情報を削除
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 */
		_removeMagnetGroup: function(groupId) {
			if (!groupId) {
				return;
			}
			this.$find('.h5mag-groupContainer[data-h5mag-group-id="' + groupId + '"]').remove();
			this.$find('.h5mag-groupContainer[data-h5mag-group-id="' + groupId + '"]').remove();
			return this.$find('>div[data-h5mag-group-id="' + groupId + '"]').removeAttr(
					'data-h5mag-group-id');
		},
		/**
		 * 既存のグループから指定されたコンテナを引きはがす。 引きはがされたときに、グループを再編成する(全部バラバラになったらグループは無くなる)
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param groupId
		 * @param $target
		 */
		_removeTargetFromMagnetGroup: function(groupId, $target) {
			// グループの削除
			this._removeMagnetGroup(groupId);

			var $adjs = null;
			// 隣接コンテナ情報の削除
			for ( var place = MAGNET_PLACE.TOP, l = MAGNET_PLACE.LEFT; place <= l; place++) {
				var $adj = $target.data('h5mag-adj-' + place);
				if (!$adj) {
					continue;
				}
				// くっついていたコンテナのadjを削除
				$adj.data('h5mag-adj-' + ((place + 1) % 4 + 1), null);
				// $targetのadjを削除
				$target.data('h5mag-adj-' + place, null);
				$adjs = $adjs ? $adjs.add($adj) : $adj;
			}

			// $targetが抜けることでできる新しいグループを計算する
			if ($adjs) {
				var that = this;
				var $created = null;
				$adjs.each(function() {
					// グループの作成
					if ($created == null) {
						$created = that._createMagnetGroup($(this));
						return;
					}
					if ($created.filter(this).length) {
						return;
					}
					$created = $created.add(that._createMagnetGroup($(this)));
				});
			}
		},
		/**
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param top
		 * @param left
		 * @param groupId
		 */
		_addGroupWrap: function(top, left, groupId, rect, layer) {
			var $wrap = $('<div></div>');
			$wrap.attr('data-h5mag-group-id', groupId);
			$wrap.addClass('h5mag-groupContainer');
			$wrap.addClass('h5mag-groupWrap');
			if (layer) {
				$wrap.attr(DATA_MAG_LAYER_ID, layer);
			}

			$wrap.css({
				top: rect.top - 8,
				left: rect.left - 8,
				height: 16 + rect.bottom - rect.top,
				width: 16 + rect.right - rect.left
			});
			$(this.rootElement).append($wrap);

			var $handle = $('<div></div>');
			$handle.attr('data-h5mag-group-id', groupId);
			$handle.addClass('h5mag-groupContainer');
			$handle.addClass('h5mag-groupHandle');
			$handle.data('rect', rect);
			$(this.rootElement).append($handle);
			$handle.css({
				top: rect.top - 8,
				left: rect.right + 8 - $handle.outerWidth()
			});
		},

		/**
		 * グループの要素を覆う四角形の座標を取得
		 *
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param $children
		 */
		_getWrapperRect: function($children) {
			// 左上と右下の座標を取得
			var wrapperRect = {
				top: Infinity,
				left: Infinity,
				right: -Infinity,
				bottom: -Infinity
			};

			$children.each(function() {
				// コンテナ要素を覆うエリアを計算
				var $this = $(this);
				var pos = $this.position();
				wrapperRect.top = Math.min(pos.top, wrapperRect.top);
				wrapperRect.left = Math.min(pos.left, wrapperRect.left);
				wrapperRect.right = Math.max(pos.left + $this.width(), wrapperRect.right);
				wrapperRect.bottom = Math.max(pos.top + $this.height(), wrapperRect.bottom);
			});
			return wrapperRect;
		},

		/**
		 * @memberOf h5.ui.components.MagnetContainer.MagnetController
		 * @param $target
		 * @returns {Promise}
		 */
		_chainAnimate: function($target, $animated, dfd) {
			if (!dfd) {
				dfd = h5.async.deferred();
				// アニメーションを途中でストップ可能にするため、$targetにdfdを持たせる
				$target.data('h5mag-animation-deferred', dfd);
				this.isAnimating = true;
			}
			// 次のアニメーション要素を取得
			var $next = null;
			$target.each(function() {
				var $this = $(this);
				for ( var place = MAGNET_PLACE.TOP, l = MAGNET_PLACE.LEFT; place <= l; place++) {
					var $adj = $this.data('h5mag-adj-' + place);
					if ($animated && $animated.filter($adj).length || $target.filter($adj).length) {
						// 既にアニメーション済みの要素だったら何もしない
						continue;
					}
					if ($next) {
						$next = $next.add($adj);
					} else {
						$next = $adj;
					}
				}
			});

			// アニメーションする要素を最初に取得しておいて、
			// completeを待ってから次へ連鎖するのではなく、complete前に次のアニメーションを実行する

			// アニメーションを実行するときは手前に出す
			$target.css({
				boxShadow: '0 0 0',
				zIndex: 3
			});
			$target.addClass('h5mag-chainAnimate');
			var count = 0;
			$target.animate({
				boxShadow: SHADOW_STYLE
			}, {
				duration: SHADOW_DURATION,
				complete: function() {
					count++;
					if (count !== $target.length) {
						// $targetが複数ある時は、全部終わるまで待つ
						return;
					}
					$target.removeClass('h5mag-chainAnimate');
					$target.css({
						boxShadow: '',
						zIndex: 1
					});
				}
			});
			if (!$next || dfd.state() !== 'pending') {
				this.isAnimating = false;
				dfd.resolve();
			} else {
				// アニメーションが済んだものを$animatedに追加
				if (!$animated) {
					$animated = $target;
				} else {
					$animated = $animated.add($target);
				}
				var that = this;
				setTimeout(function() {
					that._chainAnimate($next, $animated, dfd);
				}, SHADOW_DURATION / 2);
			}
			return dfd.promise();
		},

		_stopChainAnimate: function($target) {
			var dfd = $target.data('h5mag-animation-deferred');
			if (!dfd) {
				return;
			}
			this.animation = false;
			this.$find('.h5mag-chainAnimate').css('box-shadow', '0 0 0');
			this.$find('.h5mag-chainAnimate').removeClass('h5mag-chainAnimate');
			dfd.reject();
		}
	};

	h5.core.expose(controller);
})();