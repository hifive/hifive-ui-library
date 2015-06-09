// =============================================================================
// 業務画面 1ページに対応する、コントローラ、ロジックの定義を以下に記載する.
//
// h5.core.exposeを使って、明示的な公開を行わない限り、
// コードの定義は本ファイル内に閉じる.
// =============================================================================
(function() {
	// =========================================================================
	// このファイル内のみで有効な定数
	// =========================================================================

	// =========================================================================
	// このファイル内のみで有効な変数
	// =========================================================================
	var seq_pict_id = 0;
	var pref_pict_id = 'pict-';
	var pref_oparation_id = 'ope-';

	/**
	 * 画像の品質を定義(業務要件に従い適切なファイルサイズになる様に調整する).
	 */
	var quality = 20;

	// =========================================================================
	// このファイル内のみで有効な関数
	// =========================================================================
	function getNewPictId() {
		seq_pict_id = seq_pict_id + 1;
		window.localStorage.setItem("seq_pict_id", seq_pict_id);
		return pref_pict_id + seq_pict_id;
	}

	// =========================================================================
	// ロジックの定義
	// =========================================================================
	var pictureLogic = {

		/**
		 * 名前定義.
		 */
		__name: 'sample.PictureLogic',

		/**
		 * 初期化処理.
		 */
		init: function() {
		//			console.log("initialize pictureLogic");

		//			seq_pict_id = window.localStorage.getItem("seq_pict_id");
		//			if (seq_pict_id == null) {
		//				seq_pict_id = 0;
		//				window.localStorage.setItem("seq_pict_id", 0);
		//			} else {
		//				seq_pict_id = parseInt(seq_pict_id);
		//			}
		//			console.log("current seq_pict_id: " + seq_pict_id);
		},

		/**
		 * カメラから写真を取得する.
		 *
		 * @param quality 画像品質.
		 * @returns ディファードオブジェクト(非同期処理制御用).
		 */
		getPictureFromCamera: function(quality) {
			var dfd = this.deferred();

			navigator.camera.getPicture(function(imageData) {
				console.log("image size(kb): " + imageData.length / 1024.0);
				dfd.resolve(imageData);
			}, function(message) {
				dfd.reject(message);
			}, {
				quality: quality,
				destinationType: Camera.DestinationType.DATA_URL,
				encodingType: Camera.EncodingType.JPEG,
			});

			return dfd.promise();
		},

		/**
		 * アルバムから写真を取得する.
		 *
		 * @param quality 画像品質.
		 * @returns ディファードオブジェクト(非同期処理制御用).
		 */
		getPictureFromAlbum: function(quality) {
			var dfd = this.deferred();

			navigator.camera.getPicture(function(imageData) {
				dfd.resolve(imageData);
			}, function(message) {
				dfd.reject(message);
			}, {
				quality: quality,
				destinationType: Camera.DestinationType.DATA_URL,
				encodingType: Camera.EncodingType.JPEG,
				sourceType: Camera.PictureSourceType.PHOTOLIBRARY
			});

			return dfd.promise();
		},

		/**
		 * 写真をセーブする.
		 *
		 * @param pictId 写真ID.
		 * @param imageData イメージデータ.
		 * @returns ディファードオブジェクト(非同期処理制御用).
		 */
		save: function(pictId, imageData) {
			var dfd = this.deferred();

			//			window.localStorage.setItem(pictId, imageData);
			//			console.log('save picture: pictId = ' + pictId);

			dfd.resolve(); // localstorageにはtxがないので黙ってresolve
			return dfd.promise();
		},

		/**
		 * 操作ステータスを更新する.
		 *
		 * @param operationId 操作ID.
		 * @param status ステータス.
		 */
		updateStatus: function(operationId, status) {
			console.log("operation update status: id = " + operationId + ', status='
					+ JSON.stringify(status));
			window.localStorage.setItem(operationId, JSON.stringify(status));
		},

		/**
		 * 操作ステータスを取得する.
		 *
		 * @param operationId 操作ID.
		 * @returns ステータス.
		 */
		getOperationStatus: function(operationId) {
			var status = window.localStorage.getItem(operationId);
			if (status == null) {
				return {};
			}

			return JSON.parse(status);
		},
	};

	h5.core.expose(pictureLogic);

	// =========================================================================
	// コントローラ定義
	// =========================================================================
	/**
	 * @class
	 * @name sample.PictureController
	 */
	var registerController = {
		/**
		 * 名前定義.
		 *
		 * @memberOf sample.PictureController
		 */
		__name: 'sample.PictureController',

		/**
		 * ロジック定義.
		 *
		 * @memberOf sample.PictureController
		 */
		pictureLogic: pictureLogic,

		/**
		 * ライフサイクルイベント(初期化時).
		 *
		 * @memberOf sample.PictureController
		 */
		__ready: function(context) {
			// 画面(コンポーネント)ロード時に処理を行いたい場合はここに記述

			//			console.log('ready');

			this.pictureLogic.init();

			//			this.loadSavedData();
		},

		_angle: 0,

		_selectedImg: null,

		_$clone: null,

		_$previewContainer: null,

		/**
		 * カメラ撮影を行う。
		 *
		 * @memberOf sample.PictureController
		 * @param context
		 */
		'[data-action="getPicture"] change': function(context, $el) {
			if (context.event.currentTarget.files.length === 0) {
				return;
			}
			console.log("controller: getPictrure");

			context.event.preventDefault(); // ページ先頭に移動する挙動を抑制

			var dfd = this.deferred();

			var indicator = this.indicator({
				target: document.body,
				message: 'プレビューを準備中...',
				promises: dfd.promise(),
			}).show();

			var reader = new FileReader();
			reader.onload = this.own(function(ev) {
				this._addPreview(context, reader.result, $el, dfd);
			});

			reader.readAsDataURL(context.event.currentTarget.files[0]);
		},

		_addPreview: function(context, imageData, $el, dfd) {
			var $img = $('<img class="drawing-image background thumbnail">');
			var img = $img.get(0);

			img.onload = this.own(function() {
				// プレビューを生成
				if (!this._$previewContainer) {
					this._$previewContainer = $(this.view.get('previewContainer'));
				}
				var $previewContainer = this._$previewContainer;

				// 写真、選択した画像を覚えておく
				this._selectedImg = img;

				$('body').append($previewContainer);

				var canvas = $previewContainer.find('canvas').get(0);

				this._$clone = $img.clone();
				this._$clone.removeClass('picture');

				this.img2Canvas(this._$clone.get(0), canvas);

				$previewContainer.css('display', 'block');// プレビュー表示

				dfd.resolve();// インジケータを非表示
			});

			$img.attr('src', imageData);
		},

		img2Canvas: function(img, canvas) {
			var w = canvas.width;
			var h = canvas.height;
			var sw = img.naturalWidth;
			var sh = img.naturalHeight;

			var ctx = canvas.getContext('2d');

			var srcAspectRatio = sh / sw;
			var canvasAspectRatio = h / w;

			var dx, dy, dw, dh;
			if (canvasAspectRatio >= srcAspectRatio) {
				// canvasの方が横に長い場合
				dw = w;
				dh = w * srcAspectRatio;
				dx = 0;
				dy = (h - dh) / 2;
			} else {
				// canvasの方が縦に長い場合
				dh = h;
				dw = h / srcAspectRatio;
				dx = (w - dw) / 2;
				dy = 0;
			}

			ctx.clearRect(0, 0, w, h);
			ctx.drawImage(img, 0, 0, sw, sh, dx, dy, dw, dh);
		},


		/**
		 * 90度、270度回転するとき画像の端が欠けないよう縮小させる
		 *
		 * @param img
		 * @param canvas
		 */
		_scaleImage: function(canvas) {
			var ctx = canvas.getContext('2d');

			var w = canvas.width;
			var h = canvas.height;

			var aspect = h / w;

			// 長辺がcanvasに収まるよう変形
			ctx.scale(aspect, aspect);
		},


		'{.previewContainer .btn-0} click': function(context) {
			context.event.preventDefault();

			this._angle = 0;
			this._rotateImage(0);
		},


		'{.previewContainer .btn-90} click': function(context) {
			context.event.preventDefault();

			this._angle = 90;
			this._rotateImage(90);
		},


		'{.previewContainer .btn-180} click': function(context) {
			context.event.preventDefault();

			this._angle = 180;
			this._rotateImage(180);
		},


		'{.previewContainer .btn-270} click': function(context) {
			context.event.preventDefault();

			this._angle = 270;
			this._rotateImage(270);
		},


		'{.previewContainer .btn-90-con} click': function(context) {
			context.event.preventDefault();

			if (this._angle === 270) {
				this._angle = 0;
			} else {
				this._angle += 90;
			}
			this._rotateImage(this._angle);
		},


		_rotateImage: function(rad) {
			var canvas = this._$previewContainer.find('canvas').get(0);
			var ctx = canvas.getContext('2d');

			var w = canvas.width;
			var h = canvas.height;

			var img = this._$clone.get(0);

			var theta = rad;

			rad = rad * Math.PI / 180;

			// canvasを回転させる
			ctx.clearRect(0, 0, w, h);
			ctx.save();
			ctx.translate(w / 2, h / 2);
			ctx.rotate(rad);

			if (theta === 90 || theta === 270) {
				this._scaleImage(canvas);
			}

			ctx.translate(-1 * w / 2, -1 * h / 2);

			this.img2Canvas(img, canvas);

			ctx.restore();
		},


		/**
		 * 報告内容の写真カラムに画像を表示する。
		 *
		 * @param context
		 * @param $el
		 */
		'{.previewContainer .setAngle} click': function(context, $el) {
			context.event.preventDefault();

			// プレビューのcanvasのimageDataではsketchでぼやけるので
			// キャッシュした元のデータを複製し、回転させたデータを取得する
			var sw = this._selectedImg.width;
			var sh = this._selectedImg.height;

			// 元画像のサイズでは処理が重いので固定値にする
			var w = 1000;// canvasのwidth
			var aspect = w / sw;
			var h = sh * aspect;// canvasのheight

			var canvas = $('<canvas width="' + w + '" height="' + h + '">').get(0);
			var ctx = canvas.getContext('2d');

			var $img = $(this._selectedImg);
			$img.removeClass('picture');
			var img = $img.get(0);

			var theta = this._angle;
			var rad = theta * Math.PI / 180;

			// canvasを回転させる
			ctx.clearRect(0, 0, w, h);
			ctx.save();
			ctx.translate(w / 2, h / 2);
			ctx.rotate(rad);

			if (theta === 90 || theta === 270) {
				this._scaleImage(canvas);
			}

			ctx.translate(-1 * w / 2, -1 * h / 2);

			this.img2Canvas(img, canvas);

			ctx.restore();

			var imageData = canvas.toDataURL('image/png');


			this._addPicture($el, imageData);
		},


		'{.previewContainer .cancel} click': function(context, $el) {
			context.event.preventDefault();

			// プレビューを除去
			this._hidePreview();
			this._angle = 0;
		},


		_addPicture: function($el, imageData) {
			// プレビューを除去
			this._hidePreview();

			this._angle = 0;
			this._selectedImg = null;
			this._$clone = null;
			this.trigger('addPicture', {
				imageData: imageData
			});
		},

		_hidePreview: function() {
			var $container = this._$previewContainer;
			$container.remove();
		}
	};

	/**
	 * コントローラ定義を公開.
	 */
	h5.core.expose(registerController);

})();