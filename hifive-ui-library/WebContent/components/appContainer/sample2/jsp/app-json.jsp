<%@ page language="java" contentType="application/json; charset=UTF-8"
	pageEncoding="UTF-8"%>
<%
	String keyword = request.getParameter("keyword");
	int appNum = (int) (Math.random() * 3);
	if(keyword.startsWith("h")){
		appNum = 0;
	} else if(keyword.startsWith("喰") || keyword.startsWith("く") || keyword.startsWith("k")){
		appNum = 1;
	} else if(keyword.startsWith("f")){
		appNum = 2;
	}
	if (appNum == 0) {
%>
{
    "demosite": "<a href=\"/hifiveVisualEditor/editor\">/hifiveVisualEditor/editor</a>",
    "desc_about": "hifiveを使用したwysiwygエディタです。",
    "desc_detail": "ブラウザ上で動作するwysiwygエディタです。",
    "desc_func": "<ul><li>ブラウザ上でのHTML作成</li><li>既存のページの編集機能</li><li>編集しながら他の端末(タブレット等)に反映される自動更新機能</li><li>CSSライブエディタ</li></ul>",
    "img_url": "img/hifiveVisualEditor.png",
    "name": "hifiveVisualEditor"
}
<%
	} else if (appNum == 1) {
%>
{
    "demosite": "準備中",
    "desc_about": "ヘルスケア領域を題材に、HTML5 APIのショウケースとして作成しています。",
    "desc_detail": "「喰ぅ導」は、<br>(主に独身SEを対象とした)栄養バランス調整アプリケーションです。<br>・買う<br>・食べる…購入した食品を食べます。栄養バランスの偏りを表現するアバターが登場します<br>・導く…バランス独楽の振れ方で栄養バランスの良し悪しが解ります。<br>・測る<br>・地図で振り返る<br>機能を用い、利用者の食時のバランスアップを支援します<br>",
    "desc_func": "使用しているHTML5のAPIは<br><br>・geolocation…現在位置情報の取得<br>・video…音声、動画の再生<br>・svg…リッチな表現(アバターを表示)<br>・canvas…リッチな表現(jqplotによるグラフ表示)<br>・WebSQLDB…ローカルデータベース<br>・Server Sent Event…サーバプッシュ<br>・Application cache…オフライン実行のためのHTMLページのキャッシュ<br>・Web Fonts…独自フォントの表示<br>・css Media Query…スクリーンサイズ、縦/横置き毎のCSS適用<br>・css transform…変換<br>・css animation…アニメーション<br><br>です。<br>また、マッシュアップとして<br><br>・GoogleMap…地図情報<br><br>との連携を行っています",
    "img_url": "img/kuraudo.png",
    "name": "喰ぅ導"
}
<%
	} else if (appNum == 2) {
%>
{
    "demosite": "<a href=\"https://mdm-map.absonne.com/forex/\">/forex</a>",
    "desc_about": "外国為替情報をリアルタイムで表示します。",
    "desc_detail": "選択した通貨ペアの為替レートをリアルタイムで確認する事ができます。(データはダミーです)",
    "desc_func": "<ul><li>為替レートの確認<li>チャートの最大化<li>チャートに対するタッチ操作<li>ポートレットの移動</ul>",
    "img_url": "img/forex.png",
    "name": "forex(外国為替)"
}
<%
	}
%>