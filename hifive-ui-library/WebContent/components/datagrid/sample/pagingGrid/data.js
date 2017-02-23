(function($) {

	//ランダム数生成
	var random = function(range) {
		return Math.floor(Math.random() * range);
	};

	//氏名マスタ
	var nameMst = ['山田 太郎', '加藤 次郎', '山田 一郎', '石井 三郎', '三浦 四郎', '山田 花子', '長谷川 恵子', '山田 栄子', '山田 咲',
			'野崎 太郎', '森 次郎', '加藤 四郎', '野崎 三郎', '松本 四郎', '野崎 花子', '石井 恵子', '野崎 栄子', '野崎 咲', '森 太郎',
			'鈴木 次郎', '石井 一郎', '鈴木 三郎', '吉田 四郎', '加藤 花子', '鈴木 恵子', '鈴木 栄子', '長谷川 咲', '山本 太郎',
			'石井 次郎', '加藤 一郎', '山本 三郎', '前田 四郎', '山本 花子', '山本 恵子', '石井 栄子', '山本 咲', '佐藤 太郎',
			'加藤 次郎', '佐藤 一郎', '長谷川 三郎', '佐藤 四郎', '加藤 栄子', '森 恵子', '佐藤 栄子', '森 咲', '長谷川 太郎',
			'佐々木 次郎', '石井 次郎', '長谷川 三郎', '佐々木 四郎', '加藤 咲', '佐々木 恵子', '長谷川 栄子', '三浦 咲', '清水 太郎',
			'三浦 次郎', '松田 一郎', '岡本 三郎', '金子 四郎', '高木 花子', '近藤 恵子', '藤本 栄子', '村田 咲'];
	var nameMstLength = nameMst.length;

	//名前取得
	function getName() {
		return nameMst[random(nameMstLength)];
	}

	//配属マスタ
	var placeMst = ['東京', '大阪', '名古屋', '福岡'];
	var placeMstLength = placeMst.length;

	//配属取得
	function getPlace() {
		return placeMst[random(placeMstLength)];
	}

	//部署マスタ
	var positionMst = ['第一事業部', '第二事業部', '営業部', '総務部', '人事部', '広報部', '経理部', '企画部', '技術部', '開発部',
			'研究部'];
	var positionMstLength = positionMst.length;

	//部署取得
	function getPosition() {
		return positionMst[random(positionMstLength)];
	}

	var TEL_AREA_CODE = ['090', '080'];
	//電話番号取得
	function getTelNo() {

		var telNo = '';
		telNo += TEL_AREA_CODE[random(2)];

		telNo += '-';
		for (var i = 0; i < 4; i++) {
			telNo += '0123456789'.charAt(Math.random() * 10);
		}
		telNo += '-';
		for (var i = 0; i < 4; i++) {
			telNo += '0123456789'.charAt(Math.random() * 10);
		}
		return telNo;
	}

	//メールアドレス取得
	function getMailAddress() {
		var address = '';
		for (var i = 0; i < 4; i++) {
			address += 'abcdefghijklmnopqrstuvwxyz'.charAt(Math.random() * 25);
		}
		address += '.';
		for (var i = 0; i < 4; i++) {
			address += 'abcdefghijklmnopqrstuvwxyz'.charAt(Math.random() * 25);
		}
		address += random(10);
		address += '@dummy.htmlhifive.com';
		return address;
	}

	// サンプルデータ作成
	function createData(num) {
		var data = [];
		for (var i = 0; i < num; i++) {
			var record = {
				id: 'J' + ('00000' + i).slice(-5).toString(),
				name: getName(),
				place: getPlace(),
				position: getPosition(),
				tel: getTelNo(),
				mail: getMailAddress(),
				note: ''
			};
			data.push(record);
		}
		return data;
	}

	h5.u.obj.expose('sample', {
		createData: createData
	});

})(jQuery);