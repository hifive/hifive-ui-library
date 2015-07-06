function jQuery(){};
jQuery.prototype= new Object();
/**
  * HTTP通信でページを読み込みます。
  * この関数はjQueryにおけるAJAX通信の基本部分で、実際には$.getや$.postといった関数を使った方が、容易に実装できます。
  * 但し、これらの抽象化された関数は実装の容易さと引き換えに、エラー時のコールバックなどの複雑な機能を失っています。そのような処理を実装したい場合は、やはり基幹であるこの関数を用いる必要があります。
  * $.ajax関数は、戻り値として XMLHttpRequestオブジェクトを返します。殆どの場合、このオブジェクトを直接操作することは無いと思われますが、例えば投げてしまったリクエストを中断する場合など、必要であれば利用して下さい。
  * この関数は引数をひとつだけとりますが、実際にはハッシュで、キーと値の組み合わせにより多くのオプションを受け取ります。
  * 以下にその一覧を載せますので、参考にして下さい。
  * async / boolean非同期通信フラグ。初期値ではtrue（非同期通信）で、リクエストが投げられてから応答があるまで、ユーザエージェントは非同期に処理を続行します。falseに設定（同期通信）した場合、通信に応答があるまでブラウザはロックされ、操作を受け付けなくなることに注意してください。beforeSend / functionAJAXによりリクエストが送信される前に呼ばれるAjax Eventです。戻り値にfalseを設定すれば、AJAX送信をキャンセルすることができます。function(XMLHttpRequest){
  * this; // AJAX送信に設定したオプションを示すオブジェクト
  * }cache / booleanjQuery 1.2より。初期値は通常はtrueですが、dataTypeがscriptの場合にはfalseになります。通信結果をキャッシュしたくない場合には、falseを設定してください。complete / functionAJAX通信完了時に呼ばれる関数です。successやerrorが呼ばれた後に呼び出されるAjax Eventです。function(XMLHttpRequest, textStatus){
  * this; // AJAX送信に設定したオプションを示すオブジェクト
  * }contentType / stringサーバにデータを送信する際に用いるcontent-typeヘッダの値です。初期値は"application/x-www-form-urlencoded"で、殆どの場合はこの設定のままで問題ないはずです。data / object, stringサーバに送信する値。オブジェクトが指定された場合、クエリー文字列に変換されてGETリクエストとして付加されます。この変換処理については、後述するprocessDataを参照して下さい。オブジェクトはキーと値の組み合わせである必要がありますが、もし値が配列だった場合、jQueryは同じキーを持つ複数の値にシリアライズします。例えば {foo: ["bar1", "bar2"]} のように指定された場合、 &foo=bar1&foo=bar2 のように組み立てられます。dataFilter / function基本レベルでのXMLHttpRequestによる戻りデータをフィルタリングします。サーバからの戻り値をサニタイズする場合などに有用です。関数は第1引数に生データを、第2引数にdataTypeの値を受け取ります。フィルタをかけた値を戻り値として返して下さい。function(data, type){
  * // フィルタ処理
  * // 最後に、サニタイズ後のデータを返す
  * return data;
  * }dataType / stringサーバから返されるデータの型を指定します。省略した場合は、jQueryがMIMEタイプなどを見ながら自動的に判別します。指定可能な値は、次のようなものです。"xml": XMLドキュメント
  * "html": HTMLをテキストデータとして。ここにscriptタグが含まれた場合、処理は実行されます。
  * "script": JavaScriptコードをテキストデータとして。cacheオプションに特に指定が無ければ、キャッシュは自動的に無効になります。リモートドメインに対するリクエストの場合、POSTはGETに変換されます。
  * "json": JSON形式のデータとして評価し、JavaScriptのオブジェクトに変換します。
  * "jsonp": JSONPとしてリクエストを呼び、callbackパラメータで指定した関数に呼び戻された値をJSONデータとして処理します。(jQuery 1.2より追加)
  * "text": 通常の文字列。
  * dataTypeを指定する際は、幾つかの注すべき点があります。後述の注意1,2も参照して下さい。error / function通信に失敗した際に呼び出されるAjax Eventです。引数は3つで、順にXMLHttpRequestオブジェクト、エラー内容、補足的な例外オブジェクトを受け取ります。第2引数には "timeout", "error", "notmodified", "parsererror"などが返ります。function(XMLHttpRequest, textStatus, errorThrown){
  * // 通常はここでtextStatusやerrorThrownの値を見て処理を切り分けるか、
  * // 単純に通信に失敗した際の処理を記述します。
  * this; // thisは他のコールバック関数同様にAJAX通信時のオプションを示します。
  * }global / booleanAjax EventsのGlobal Eventsを実行するかどうかを指定します。通常はtrueですが、特別な通信でfalseにすることも出来ます。詳しくはAjax Eventsを参照して下さい。ifModified / booleanサーバからの応答にあるLast-Modifiedヘッダを見て、前回の通信から変更がある場合のみ成功ステータスを返します。jsonp / stringjsonpリクエストを行う際に、callbackではないパラメータであれば指定します。例えば {jsonp: 'onJsonPLoad'} と指定すれば、実際のリクエストには onJsonPLoad=[関数名] が付与されます。password / string認証が必要なHTTP通信時に、パスワードを指定します。processData / booleandataに指定したオブジェクトをクエリ文字列に変換するかどうかを設定します。初期値はtrueで、自動的に "application/x-www-form-urlencoded" 形式に変換します。DOMDocumentそのものなど、他の形式でデータを送るために自動変換を行いたくない場合はfalseを指定します。scriptCharset / stringスクリプトを読み込む際のキャラセットを指定します。dataTypeが"jsonp"もしくは"script"で、実行されるページと呼び出しているサーバ側のキャラセットが異なる場合のみ指定する必要があります。success / functionAJAX通信が成功した場合に呼び出されるAjax Eventです。戻ってきたデータとdataTypeに指定した値の2つの引数を受け取ります。function(data, dataType){
  * // dataの値を用いて、通信成功時の処理を記述します。
  * this; // thisはAJAX送信時に設定したオプションです
  * }timeout / numberタイムアウト時間をミリ秒で設定します。$.ajaxSetupで指定した値を、通信に応じて個別に上書きすることができます。type / string"POST"か"GET"を指定して、HTTP通信の種類を設定します。初期値は"GET"です。RESTfulに"PUT"や"DELETE"を指定することもできますが、全てのブラウザが対応しているわけではないので注意が必要です。url / stringリクエストを送信する先のURLです。省略時は呼び出し元のページに送信します。username / string認証が必要なHTTP通信時に、ユーザ名を指定します。xhr / functionXMLHttpRequestオブジェクトが作成された際に呼び出されるコールバック関数です。この関数は、例えばIEではXMLHttpRequestではなくActiveXObjectが作られた際に呼ばれます。もし、サイト特有のXMLHttpRequestオブジェクトの拡張やインスタンス管理のファクトリーを持っている場合には、この関数で生成物を上書きすることが出来ます。jQuery1.2.6以前では利用できません。
  * ※注意1
  * dataTypeオプションを用いる場合、サーバからの応答が正しいMIMEタイプを返すことを確認して下さい。
  * もしMIMEタイプと指定されたdataTypeに不整合がある場合、予期しない問題を引き起こす場合があります。
  * 詳しくはSpecifying the Data Type for AJAX Requests (英語)を参照して下さい。
  * ※注意2
  * dataTypeに"script"を指定して他のドメインへの送信を行う場合、POSTを指定してもリクエストはGETに自動的に変換されます。
  * jQuery 1.2からは、異なったドメインからもJSONPを用いてJSONデータを取得できるオプションが付きました。JSONPを提供するサーバが "url?callback=function" のような形でリクエストを受け付ける場合には、jQueryは自動的にfunctionを指定してJSONデータを受け取ります。
  * また、パラメータが callback ではない場合、jsonpオプションにパラメータ名を指定することで同様に処理できます。
  * function ajax()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=77001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=77001
*/
jQuery.prototype.ajax=function(){};
/**
  * HTTP(GET)通信でページを読み込みます。
  * シンプルなGETリクエストを送る簡単な方法で、複雑な$.ajax関数を使わずにサーバと通信ができます。通信の完了時に実行される関数を引数で指定することも可能ですが、これは成功時のみ実行されるので、失敗時と成功時の両方をカバーするには、$.ajaxを使う必要があります。
  * function get()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=78001">More</a><br/>
  * @param {String} url
  * @param {Map} data
  * @param {Function} callback

  * @returns {XMLHttpRequest}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=78001
*/
jQuery.prototype.get=function(url,data,callback){};
/**
  * HTTP(GET)通信でJSON形式のデータを読み込む。
  * jQuery1.2では、JSONPのコールバック関数を指定すれば、別のドメインにあるJSON形式のデータを読み込む事が可能になった。(書式："myurl?callback=?")jQueryは？を呼び出したい関数名に置換し、それを実行する。
  * 【注意】この関数以下のコードは、コールバック関数が呼ばれる前に実行される。
  * function getJSON()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=79001">More</a><br/>
  * @param {String} url
  * @param {Map} data
  * @param {Function} callback

  * @returns {XMLHttpRequest}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=79001
*/
jQuery.prototype.getJSON=function(url,data,callback){};
/**
  * HTTP(GET)HTTP通信(GET)で、ローカルのJavaScriptファイルを読み込み、実行する。
  * jQuery1.2以前では、getScriptは同ドメイン内のスクリプトを読み込むだけだったが、jQuery1.2では別のドメインのJavaScriptを読み込む事もできるようになった。。
  * 【注意】Safari2とそれ以前のバージョンでは、global context 内でスクリプトを同期で評価することはできないので、後で呼び出すこと。
  * function getScript()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=80001">More</a><br/>
  * @param {String} url
  * @param {Function} callback

  * @returns {XMLHttpRequest}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=80001
*/
jQuery.prototype.getScript=function(url,callback){};
/**
  * HTMLを読み込み、DOMに挿入します。
  * デフォルトはGET通信ですが、追加のパラメータを設定すればPOSTでも可。
  * jQuery1.2ではURLの中でjQueryセレクタを使用可能で、これによって結果の中からセレクタにマッチする要素のみ取り出して挿入することが可能です。書式は、例えば"url #id > セレクタ"のようになります。詳しくは下記のサンプルを参照のこと。
  * function load()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=81001">More</a><br/>
  * @param {String} url
  * @param {Map} data
  * @param {Function} callback

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=81001
*/
jQuery.prototype.load=function(url,data,callback){};
/**
  * 入力された全てのElementを文字列のデータにシリアライズする。
  * jQuery1.2ではserializeメソッドはformをシリアライズするが、それ以前のバージョンだとForm Plugin(Form用プラグイン)のfieldSerializeメソッドでシリアライズする必要がある。
  * function serialize()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=82001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=82001
*/
jQuery.prototype.serialize=function(){};
/**
  * serializeメソッドのようにFormやElementをシリアライズするが、JSON形式のデータ構造で戻り値を返す。
  * function serializeArray()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=83001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=83001
*/
jQuery.prototype.serializeArray=function(){};
/**
  * 指定した要素に、CSSクラスを追加する。
  * function addClass()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=84001">More</a><br/>
  * @param {String} class

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=84001
*/
jQuery.prototype.addClass=function(class){};
/**
  * 値の変わりにコールバック関数を設定し、全ての要素に属性を設定する。
  * 上記の用途で値として関数の戻り値を入れるのではなく、関数ポインタを渡してやることで属性を設定しながら関数がコールバックされる形になる。
  * コールバック関数のスコープ内でのthisポインタは処理中の要素そのものになる。また、要素のインデックスを取りたい場合は第一引数で渡される配列の[0]を取得すること。
  * function attr()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=76004">More</a><br/>
  * @param {String} key
  * @param {Function} fn

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=76004
*/
jQuery.prototype.attr=function(key,fn){};
/**
  * キーと値を渡して、全ての要素に属性を設定する。
  * function attr()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=76004">More</a><br/>
  * @param {String} key
  * @param {Object} value

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=76004
*/
jQuery.prototype.attr=function(key,value){};
/**
  * 最初の要素が持つ指定属性の値を返す。
  * 要素が指定属性を持っていない場合、関数はundefinedを返す。
  * function attr()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=76004">More</a><br/>
  * @param {String} name

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=76004
*/
jQuery.prototype.attr=function(name){};
/**
  * キーと値の組み合わせからなるハッシュオブジェクトを引数に渡し、全ての要素に複数の属性を同時に設定する。
  * これは大量の属性を設定したい場合に適した方法である。
  * ※もしclass属性を設定したい場合は、キーの名前は'className'である必要がある。これは、Internet Explorerでclassが予約語扱いになっているためである。もしくは、.addClass(class)/.removeClass(class)メソッドを用いること。
  * function attr()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=76004">More</a><br/>
  * @param {Map} properties

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=76004
*/
jQuery.prototype.attr=function(properties){};
/**
  * 指定した要素のHTMLに指定値をセットする。
  * この関数はXMLでは動作しないが、XHTMLでは有効。
  * function html()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=84003">More</a><br/>
  * @param {String} val

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=84003
*/
jQuery.prototype.html=function(val){};
/**
  * 最初の要素をHTML文字列で返す。組み込みであるinnerHTMLの値と同じ。
  * この関数はXMLでは動作しないが、XHTMLでは有効である。
  * function html()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=84003">More</a><br/>

  * @returns {String}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=84003
*/
jQuery.prototype.html=function(){};
/**
  * 指定属性を持つ要素から、属性を削除する。
  * function removeAttr()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=91001">More</a><br/>
  * @param {String} name

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=91001
*/
jQuery.prototype.removeAttr=function(name){};
/**
  * 指定した要素から、CSSクラスを削除する。
  * function removeClass()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=92001">More</a><br/>
  * @param {String} class

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=92001
*/
jQuery.prototype.removeClass=function(class){};
/**
  * 条件に一致する全ての要素にテキストを設定する。
  * html(val)に似ているが、これはあくまでテキストなので、”<“や”>“などはエスケープされてHTMLエンティティとして追加される。
  * function text()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=89005">More</a><br/>
  * @param {String} val

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=89005
*/
jQuery.prototype.text=function(val){};
/**
  * 指定した要素が持つテキストノードを結合したものを返す。
  * 返される文字列は、条件に一致する全ての要素が子孫にいたるまで持っているテキストを結合したものになる。
  * この関数は、HTMLでもXMLでも動作する。
  * function text()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=89005">More</a><br/>

  * @returns {String}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=89005
*/
jQuery.prototype.text=function(){};
/**
  * 指定したCSSクラスを要素に、switchがtrueであれば追加し、falseであれば削除する。
  * function toggleClass()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=95001">More</a><br/>
  * @param {String} class
  * @param {Boolean} switch2

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=95001
*/
jQuery.prototype.toggleClass=function(class,switch2){};
/**
  * 指定したCSSクラスが要素に無ければ追加し、あれば削除する。
  * function toggleClass()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=95001">More</a><br/>
  * @param {String} class

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=95001
*/
jQuery.prototype.toggleClass=function(class){};
/**
  * 全ての要素のvalue属性を返す。
  * jQuery1.2では、selectボックスにも値をセットできるようになった。
  * function val()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=86001">More</a><br/>
  * @param {String} val

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=86001
*/
jQuery.prototype.val=function(val){};
/**
  * 全ての要素のvalue属性を返す。
  * jQuery1.2では、最初の要素だけではなく全てのvalue属性を返すようになった。複数選択可能なselectボックスなどでは、値は配列として返す。旧バージョンではFormプラグインのfieldValue関数として実装されていた動作。
  * function val()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=86001">More</a><br/>

  * @returns {Array}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=86001
*/
jQuery.prototype.val=function(){};
/**
  * jQuery 1.3より。
  * jQueryオブジェクトが持つDOMノード上でのオブジェクトを保持します。
  * この値はselectorと一緒に使われることになると思います。
  * これらのプロパティは、主にプラグイン開発時に役立つでしょう。
  * Property context
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=97002">More</a><br/>
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=97002
*/
jQuery.prototype.context="";
/**
  * 合致した全てのエレメントに対して関数を実行する。
  * これは、合致するエレメントが見つかる度に1度ずつ、毎回関数が実行されることを意味する。
  * その際に、関数内でthisポインタは各エレメントを指す。
  * そしてコールバック関数は第一引数に、エレメントセットの中での、ゼロから始まるインデックスを受け取る。
  * 関数内で戻り値にfalseを設定した場合、ループはそこで終了。これは通常のloop構文におけるbreakのような役割である。
  * 戻り値にtrueを返した場合は、次のループに処理が移る。こちらはloop文のcontinueのような働きである。
  * function each()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=100001">More</a><br/>
  * @param {Function} callback

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=100001
*/
jQuery.prototype.each=function(callback){};
/**
  * エレメントの集合から、指定したポジションのエレメントだけを取り出す。
  * ゼロからlength-1までのうちから、合致する位置にあるエレメントだけが戻される。
  * function eq()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=93003">More</a><br/>
  * @param {Number} position

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=93003
*/
jQuery.prototype.eq=function(position){};
/**
  * DOMエレメントの集合からインデックスを指定して、ひとつのエレメントを参照する。
  * これによって、特にjQueryオブジェクトである必要のないケースで特定のDOM Elementそのものを操作することが可能。
  * 例えば$(this).get(0)は、配列オペレータである$(this)[0]と同等の意味になる。
  * function get()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=78001">More</a><br/>
  * @param {Number} index

  * @returns {Element}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=78001
*/
jQuery.prototype.get=function(index){};
/**
  * DOMエレメントの配列にアクセスする。
  * jQueryオブジェクトが持つエレメント全てを配列の形で返す。
  * このライブラリで用意されたjQueryオブジェクトではなく、標準スタイルの配列でエレメントを操作したい場合に有用。
  * jQuery以外のライブラリで作られた関数などに配列を渡す際にも役に立つ。
  * function get()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=78001">More</a><br/>

  * @returns {Array Element}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=78001
*/
jQuery.prototype.get=function(){};
/**
  * jQueryオブジェクト内で、引数で指定されたエレメントのインデックス番号を返す。インデックスは、ゼロから始まる連番。
  * もし渡されたエレメントがjQueryオブジェクト内に存在しない場合、戻り値には-1が返る。
  * function index()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=102001">More</a><br/>
  * @param {Element} subject

  * @returns {Number}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=102001
*/
jQuery.prototype.index=function(subject){};
/**
  * $(document).ready()の短縮形。
  * DOM Documentのロードが終わった際に、バインドしておいた関数が実行されるようになる。
  * この関数は$(document).ready()と全く同様に動作する。
  * この関数は技術的には他の$()関数と同様に連鎖可能であるが、使い道は無い。
  * function jQuery()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=75002">More</a><br/>
  * @param {Function} callback

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=75002
*/
jQuery.prototype.jQuery=function(callback){};
/**
  * 単数もしくは複数のDOM Elementを、jQueryオブジェクトに変換する。
  * この関数の引数は、XML DocumentsやWindowオブジェクトのようなDOM Elementではないものに関しても受け付けることができる。
  * function jQuery()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=75002">More</a><br/>
  * @param {Element,Arrya Element} elements

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=75002
*/
jQuery.prototype.jQuery=function(elements){};
/**
  * この関数は、エレメントとマッチさせるCSSセレクターを含む文字列を受け取る。
  * jQueryの核になる関数である。jQueryの全てはこの関数を基本にしているか、もしくは何がしかの形で使っている。
  * この機能の最も基本的な利用方法は、合致するエレメントを抽出するためのexpression（大抵はCSSを含む）を受け取ることである。
  * もしcontextが何も指定されなければ、$()関数は現在のHTMLのDOMエレメントを検索する。
  * 逆にDOMエレメントやjQueryオブジェクトなどのcontextが指定されれば、expressionはそのcontextに対して合致するものを捜します。
  * expressionの文法については、Selectorsのページを参照。
  * function jQuery()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=75002">More</a><br/>
  * @param {String} expression
  * @param {Element,jQuery} context

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=75002
*/
jQuery.prototype.jQuery=function(expression,context){};
/**
  * jQueryオブジェクトそのものを拡張する。
  * jQuery.fn.extendがjQueryオブジェクトのプロトタイプを拡張するのに対して、このメソッドはjQuery名前空間に新たなメソッドを追加する。
  * function extend()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=98002">More</a><br/>
  * @param {Object} object

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=98002
*/
jQuery.prototype.extend=function(object){};
/**
  * jQueryエレメントに独自の新しいメソッドを追加する。（典型的なjQueryプラグインの作成方法）
  * function fn.extend()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=100002">More</a><br/>
  * @param {Object} object

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=100002
*/
jQuery.prototype.fn.extend=function(object){};
/**
  * 生のHTML文字列からDOMエレメントを作成します。
  * ベタ書きであれ、何がしかのテンプレートエンジンやプラグイン、AJAXでのロードであれ、文字列として書かれたHTMLを受け取ります。
  * 注意点として、inputタグの作成時に若干の制限があります。これはサンプル2を参照してください。
  * また、スラッシュを含むような文字列（imgタグのパスなど）を渡す場合は、これをエスケープしてやる必要があります。
  * XHTMLフォーマットでの記述時に空要素を記述する場合は、$("<span/>")のように書きます。jQuery1.3からは、$(document.createElement("span"))のように記述することもできます。
  * function jQuery()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=75002">More</a><br/>
  * @param {String} html

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=75002
*/
jQuery.prototype.jQuery=function(html){};
/**
  * $関数のみならず、jQueryオブジェクトも含めて完全にグローバルの名前空間から除去する。運用は慎重に行うこと。
  * これは、上記のnoConflict()を更に極端にして$関数だけでなくjQueryオブジェクトも、先に定義された動作に戻してしまうものである。
  * これを使わなければいけないケースは極めて稀だと考えられるが、例えば複数のバージョンのjQueryを混在して使わなければならないような場合だとか。あるいは、jQueryオブジェクトへの拡張がConflictしてしまった場合などに必要かもしれない。
  * function noConflict()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=108001">More</a><br/>
  * @param {Boolean} extreme

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=108001
*/
jQuery.prototype.noConflict=function(extreme){};
/**
  * この関数を実行すると、$関数の動作が先に定義されている動作に戻る。
  * $関数はprototype.jsなどをはじめ、多くのライブラリがそれぞれ拡張している関数である。
  * jQueryでも、核となるjQueryオブジェクトのショートカットして極めて頻繁に利用される。
  * このコマンドは、そのような$関数を定義する複数のライブラリを用いた際に衝突することを防ぐものである。
  * noConflictを使った場合、jQueryオブジェクトの呼び出しには明確に'jQuery'と書く必要がある。
  * 例えば$(“div p”)と書いていたものも、jQuery(“div p”)と書かなければならない。
  * function noConflict()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=108001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=108001
*/
jQuery.prototype.noConflict=function(){};
/**
  * jQueryオブジェクトのエレメント数を保持する。
  * 保持する値はjQueryオブジェクトのsizeメソッドの戻り値と同じである。
  * Property length
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=103002">More</a><br/>
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=103002
*/
jQuery.prototype.length="";
/**
  * jQuery 1.3より。
  * jQuery()関数で返されたオブジェクトに対して、指定されたセレクター書式を取得します。
  * この値はcontextと一緒に使われることになると思います。
  * これらのプロパティは、主にプラグイン開発時に役立つでしょう。
  * Property selector
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=96002">More</a><br/>
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=96002
*/
jQuery.prototype.selector="";
/**
  * jQueryオブジェクトのエレメント数を返す。
  * 返される値はjQueryオブジェクトのlengthプロパティと同じである。
  * function size()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=103005">More</a><br/>

  * @returns {Number}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=103005
*/
jQuery.prototype.size=function(){};
/**
  * キーと値を引数に渡して、全ての要素のstyle属性を設定します。
  * valueに数値が入った場合、自動的に単位はピクセルとみなされます。
  * function css()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=75002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=75002
*/
jQuery.prototype.css=function(){};
/**
  * 最初の要素が持つstyle属性から指定スタイルの値を返します。
  * function css()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=75002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=75002
*/
jQuery.prototype.css=function(){};
/**
  * キーと値がセットになったハッシュを渡すことで、全ての要素のstyle属性を設定します。
  * 全ての要素に同じスタイルをセットしたい場合に便利です。
  * function css()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=75002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=75002
*/
jQuery.prototype.css=function(){};
/**
  * 全ての要素の高さを指定します。
  * 引数の値が数値のみで、”em”や”%“のような単位が指定されない場合は全て”px”として判断します。
  * function height()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=79002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=79002
*/
jQuery.prototype.height=function(){};
/**
  * 最初の要素の高さをピクセル単位で取得します。
  * jQuery1.2からは、このメソッドでwindowやdocumentの高さも取得できるようになりました。
  * function height()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=79002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=79002
*/
jQuery.prototype.height=function(){};
/**
  * 最初の要素の内部高さ(borderは除き、paddingは含む)を取得します。
  * この関数は、要素の表示/非表示状態にかかわらず機能します。
  * function innerHeight()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=114001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=114001
*/
jQuery.prototype.innerHeight=function(){};
/**
  * 最初の要素の内部横幅(borderは除き、paddingは含む)を取得します。
  * この関数は、要素の表示/非表示状態にかかわらず機能します。
  * function innerWidth()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=80002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=80002
*/
jQuery.prototype.innerWidth=function(){};
/**
  * 最初の要素の、ドキュメント上での表示位置を返します。
  * 戻り値のオブジェクトはtopとleftの2つの数値を持ちます。この関数は、可視状態にある要素に対してのみ有効です。
  * function offset()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=115001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=115001
*/
jQuery.prototype.offset=function(){};
/**
  * 最初の要素の外部高さ(border、paddingを含む)を取得します。
  * オプションにmarginを指定してやることで、高さにmerginを含めることもできます。
  * この関数は、要素の表示/非表示状態にかかわらず機能します。
  * function outerHeight()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=116001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=116001
*/
jQuery.prototype.outerHeight=function(){};
/**
  * 最初の要素の外部横幅(border、paddingを含む)を取得します。
  * オプションにmarginを指定してやることで、横幅にmerginを含めることもできます。
  * この関数は、要素の表示/非表示状態にかかわらず機能します。
  * function outerWidth()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=117001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=117001
*/
jQuery.prototype.outerWidth=function(){};
/**
  * 最初の要素の、親要素からの相対的な表示位置を返します。
  * 戻り値はtop、leftを持つオブジェクトで、各値はpixel単位の数値になります。
  * この値は、marginやborder、paddingなどを含めて正確に計算された値です。
  * この関数は、表示されている要素にのみ有効です。
  * function position()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=81002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=81002
*/
jQuery.prototype.position=function(){};
/**
  * 合致する全ての要素のスクロール左位置を指定します
  * この関数は、要素の表示/非表示状態にかかわらず機能します。
  * function scrollLeft()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=83002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=83002
*/
jQuery.prototype.scrollLeft=function(){};
/**
  * 最初の要素の現在のスクロール上の左位置を取得します。
  * この関数は、要素の表示/非表示状態にかかわらず機能します。
  * function scrollLeft()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=83002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=83002
*/
jQuery.prototype.scrollLeft=function(){};
/**
  * 合致する全ての要素のスクロール上位置を指定します
  * この関数は、要素の表示/非表示状態にかかわらず機能します。
  * function scrollTop()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=85002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=85002
*/
jQuery.prototype.scrollTop=function(){};
/**
  * 最初の要素の現在のスクロール上の上位置を取得します。
  * この関数は、要素の表示/非表示状態にかかわらず機能します。
  * function scrollTop()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=85002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=85002
*/
jQuery.prototype.scrollTop=function(){};
/**
  * 全ての要素の横幅を指定します。
  * 引数の値が数値のみで、”em”や”%“のような単位が指定されない場合は全て”px”として判断します。
  * function width()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=86002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=86002
*/
jQuery.prototype.width=function(){};
/**
  * 最初の要素の横幅をピクセル単位で取得します。
  * jQuery1.2からは、このメソッドでwindowやdocumentの横幅も取得できるようになりました。
  * function width()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=86002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=86002
*/
jQuery.prototype.width=function(){};
/**
  * 自分で独自のアニメーション効果を作成するための関数です。
  * この関数でポイントになるのは、style属性の変化です。例えば”height”,”top”,”opacity”のようなstyleを、どのような値で完了させたいかを渡してやることで現在の値から変化させていきます。
  * ※ これらの値は、キャメルケースで表記されなければなりません。例えばmargin-leftは、marginLeftのように記述します。
  * 例えば現在のheightが10pxで、animate関数に{height: “100px”}と渡した場合、高さが10pxから100pxに徐々に変化していく効果が得られます。これは数値のみに適用されますが、それ以外にも” hide”,”show”,”toggle”などの文字列が指定された場合にも、対応した効果を作成してくれます。
  * そもそも数値型の値をとらない属性（backgroundColorなど）には、animate関数は対応していません。
  * 第二引数にはアニメーションの動作期間を指定します。”slow”、”normal”、”fast”、もしくは完了までの時間をミリ秒単位で指定します。例えば”1500”であれば、1.5秒かけてアニメーションが行われます。
  * 第三引数には、値の変化量を調節するeasing名を渡します。ここに独自の関数を指定することで「徐々に速くなる」「最後にゆっくりになる」「上下しつつ進む」などの変化に富んだ効果を得ることが出来ます。
  * 第四引数には、アニメーション終了時に実行する関数のポインタを渡すことができます。
  * jQuery1.2からは、”px”だけでなく”em”や”%“にも対応するようになりました。
  * 更に、バージョン1.2からは相対的な値の指定が可能になっています。値の前に”+=“、”-=“を付けることで、現在の値からの増減を表すことができます。
  * jQuery1.3からは、durationに 0 を指定した場合の処理タイミングが若干変更になりました。
  * 以前はステータスが完了状態になる前に、非同期にアニメーションが終了（dutrationがゼロなので、実際には最終形に変化するだけ）していましたが、1.3からはこのタイミングを完全に合わせています。
  * function animate()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=87002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=87002
*/
jQuery.prototype.animate=function(){};
/**
  * 前述の指定では第二引数以降で指定していたものを、ハッシュにして第二引数で選択的に渡すことが可能になりました。
  * 第三引数以降を用いたものでは、例えば終了時点の関数のみを指定したくても、全ての引数にデフォルトの値を明示的に指定してやらないといけません。そういった煩わしさを無くすため、連想配列で指定できるようになっています。
  * 指定できるオプションは、以下の通りです。
  * durationアニメーションの動作期間を指定します。”slow”、”normal”、”fast”、もしくは完了までの時間をミリ秒単位で指定します。例えば”1500”であれば、1.5秒かけてアニメーションが行われます。
  * 初期値は”normal”です。
  * easing値の変化量を調節するカスタム関数の名前を渡します(参考)。ここに独自の関数を指定することで「徐々に速くなる」「最後にゆっくりになる」「上下しつつ進む」などの変化に富んだ効果を得ることが出来ます。
  * 独自に作成したり、プラグインを入れなくても使える値は”linear”と”swing”だけです。
  * 初期値は”swing”です。
  * complete各要素のアニメーションが終わった際に実行される関数を指定します。
  * stepアニメーション実行中のフレーム毎に呼び出される関数を指定します。
  * 現在の値から着地点になる値が増えている場合は0から1、減っていく場合は1から0の値が第一引数に渡されてきます。例えば引数に0.5が来れば、全体のちょうど半分が実行されたタイミングであることを示します。
  * 関数が何回、どのようなタイミングで呼ばれるかはCPUによりますので、常に不定です。
  * queueここにfalseを指定すると、アニメーションはキューに保存されずに、ただちに実行されます。
  * 初期値はtrueです。
  * jQuery1.2から追加されました。
  * function animate()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=87002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=87002
*/
jQuery.prototype.animate=function(){};
/**
  * 待ち行列の先頭から処理を取り出し、実行します。
  * function dequeue()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=121001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=121001
*/
jQuery.prototype.dequeue=function(){};
/**
  * 各要素の透明度を操作して、非表示の要素をフェードイン表示させます。
  * アニメーション効果は指定したスピードで実行されます。
  * 速度は、”slow”、”normal”、”fast”、もしくは完了までの時間をミリ秒単位で指定します。例えば”1500”であれば、1.5秒かけてアニメーションが行われます。
  * 省略された場合は、”normal”が用いられます。
  * また、効果が完了した際に呼び出される関数を第二引数に指定することも出来ます。
  * function fadeIn()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=89002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=89002
*/
jQuery.prototype.fadeIn=function(){};
/**
  * 各要素の透明度を操作して、表示されている要素をフェードアウトさせます。
  * アニメーション効果は指定したスピードで実行されます。
  * 速度は、”slow”、”normal”、”fast”、もしくは完了までの時間をミリ秒単位で指定します。例えば”1500”であれば、1.5秒かけてアニメーションが行われます。
  * 省略された場合は、”normal”が用いられます。
  * また、効果が完了した際に呼び出される関数を第二引数に指定することも出来ます。
  * function fadeOut()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=102002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=102002
*/
jQuery.prototype.fadeOut=function(){};
/**
  * 各要素の透明度を、指定した値まで徐々に変化させる効果を与えます。
  * アニメーション効果は指定したスピードで実行されます。
  * 速度は、”slow”、”normal”、”fast”、もしくは完了までの時間をミリ秒単位で指定します。例えば”1500”であれば、1.5秒かけてアニメーションが行われます。
  * 到達する透明度は、1を100%の濃度（透過しない状態）、0を完全に透明な状態として指定します。例えば0.33であれば、これは33%の見え方になります。
  * また、効果が完了した際に呼び出される関数を第三引数に指定することも出来ます。
  * function fadeTo()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=122001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=122001
*/
jQuery.prototype.fadeTo=function(){};
/**
  * 各要素のうち、表示状態にあるものをアニメーション効果付きで非表示にします。
  * 同時に、非表示状態になった時（アニメーション効果が完了した時）に実行されるコールバック関数を登録することも可能です。
  * アニメーションは指定された速度で、横幅、高さ、透明度が変化しながら消えていきます。速度は”slow”、”normal”、”fast”のいずれかか、もしくはアニメーションが完了するまでの時間をミリ秒で指定します。例えば” 1500”が指定されれば、1.5秒かかって非表示になる効果が与えられることになります。
  * function hide()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=76002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=76002
*/
jQuery.prototype.hide=function(){};
/**
  * 各要素のうち、表示状態にあるものを非表示にします。
  * hide(speed, [callback])と同じ動作ですが、アニメーションが無く即座に非表示になります。要素が既に非表示になっている場合は、何も起こりません。
  * function hide()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=76002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=76002
*/
jQuery.prototype.hide=function(){};
/**
  * この値にtrueを設定すると、jQueryが提供する全ての動作からアニメーション処理を外します。
  * その場合、durationに 0 が指定されたのと同様に、すぐに変化後の形になります。
  * このプロパティは、例えば次のような理由で使われることを想定しています。
  * 処理速度の遅い端末でjQueryを動作させるため、アニメーション処理が滑らかに動かず邪魔
  * アニメーションすることにより、一部ユーザのアクセシビリティに問題が起きる
  * この値をfalseにすれば、再びアニメーション処理は戻ります。
  * Property fx.off
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=124001">More</a><br/>
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=124001
*/
jQuery.prototype.fx.off="";
/**
  * 全ての要素集合のqueueの末尾に、新しいエフェクトを追加します。
  * function queue()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=106002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=106002
*/
jQuery.prototype.queue=function(){};
/**
  * 全ての要素集合の持つqueueを、引数で渡したものに差し替えます。
  * 渡すのは新たなqueueとなる関数の配列になります。
  * function queue()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=106002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=106002
*/
jQuery.prototype.queue=function(){};
/**
  * 最初の要素が持つqueueを、関数配列として返します。
  * function queue()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=106002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=106002
*/
jQuery.prototype.queue=function(){};
/**
  * 各要素のうち、非表示状態にあるものをアニメーション効果付きに表示します。
  * 同時に、表示状態になった時（アニメーション効果が完了した時）に実行されるコールバック関数を登録することも可能です。
  * アニメーションは指定された速度で、横幅、高さ、透明度が変化しながら表示されていきます。速度は”slow”、”normal”、”fast”のいずれかか、もしくはアニメーションが完了するまでの時間をミリ秒で指定します。例えば” 1500”が指定されれば、1.5秒かかって表示される効果が与えられることになります。
  * function show()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=111002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=111002
*/
jQuery.prototype.show=function(){};
/**
  * 各要素のうち、非表示状態にあるものを表示します。
  * show(speed, [callback])と同じ動作ですが、アニメーションが無く即座に表示されます。要素が既に表示されている場合は、何も起こりません。要素の「非表示状態」は、hide()メソッドを使ったものであれ、スタイル属性で display:none を用いたものであれ、同様に表示状態にします。
  * function show()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=111002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=111002
*/
jQuery.prototype.show=function(){};
/**
  * 各要素の高さを操作して、上から下にスライドして降りて来るイメージの効果で表示させます。
  * アニメーション効果は指定したスピードで実行されます。
  * 速度は、”slow”、”normal”、”fast”、もしくは完了までの時間をミリ秒単位で指定します。例えば”1500”であれば、1.5秒かけてアニメーションが行われます。
  * 省略した場合は”normal”が用いられます。
  * また、効果が完了した際に呼び出される関数を第二引数に指定することも出来ます。
  * function slideDown()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=113002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=113002
*/
jQuery.prototype.slideDown=function(){};
/**
  * 各要素の高さを操作して、slideDown/slideUpの動作を交互に行います。
  * アニメーション効果は指定したスピードで実行されます。
  * 速度は、”slow”、”normal”、”fast”、もしくは完了までの時間をミリ秒単位で指定します。例えば”1500”であれば、1.5秒かけてアニメーションが行われます。
  * 省略された場合は、”normal”が用いられます。
  * また、効果が完了した際に呼び出される関数を第二引数に指定することも出来ます。
  * function slideToggle()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=127001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=127001
*/
jQuery.prototype.slideToggle=function(){};
/**
  * 各要素の高さを操作して、下から上に消えていくイメージの効果で非表示にします。
  * アニメーション効果は指定したスピードで実行されます。
  * 速度は、”slow”、”normal”、”fast”、もしくは完了までの時間をミリ秒単位で指定します。例えば”1500”であれば、1.5秒かけてアニメーションが行われます。
  * 省略された場合は、”normal”が用いられます。
  * また、効果が完了した際に呼び出される関数を第二引数に指定することも出来ます。
  * function slideUp()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=128001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=128001
*/
jQuery.prototype.slideUp=function(){};
/**
  * 指定した要素集合から、現在動作中のアニメーション処理を全て中止します。
  * 他のアニメーションがqueueに入ってる場合、次のアニメーションが直ちに実行されることになります。
  * function stop()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=114002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=114002
*/
jQuery.prototype.stop=function(){};
/**
  * 要素の表示/非表示を、関数が呼び出される度にアニメーション付きで切り替えます。
  * 同時に、アニメーション終了時に呼び出されるコールバック関数を指定することもできます。
  * アニメーションは、高さ、横幅、透明度が指定された速度で徐々に消えていく形になります。
  * jQuery1.3からは、各要素の padding や margin の値も同時に変化するようになりました。
  * function toggle()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=81003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=81003
*/
jQuery.prototype.toggle=function(){};
/**
  * 各要素を、引数がtrueであれば表示、falseであれば非表示に切り替えます。
  * function toggle()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=81003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=81003
*/
jQuery.prototype.toggle=function(){};
/**
  * 各要素のうち、表示状態にあるものを非表示にし、非表示状態にあるものは表示状態にします。
  * function toggle()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=81003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=81003
*/
jQuery.prototype.toggle=function(){};
/**
  * 要素が持つ、例えば”click”などのイベントに対してコールバック関数を紐付けます。カスタムイベントに対してもbind可能です。
  * イベントハンドラは、コールバック関数に対してイベントオブジェクトを渡します。”click”や”submit”などの元々の動作をキャンセルするには、戻り値にfalseを返してください。これにより、イベントのbubblingも止まりますので、親要素が持つイベントの発生もキャンセルされてしまうことに注意してください。ほとんどの場合は、イベントには無名関数を渡すことが出来ます。そうしたケースであれば同じクロージャの中で変数を利用できますが、それが難しいような場合は第二引数を用いてデータを引き渡すことも可能です。（その場合はコールバック関数は三番目の引数になります）
  * function bind()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=118002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=118002
*/
jQuery.prototype.bind=function(){};
/**
  * 各要素のblurイベントに関数をbindします。
  * blurイベントは通常、要素がマウスなどのポインティング・デバイスやタブキーなどでフォーカスを失ったタイミングで発生します。
  * jQueryのイベントは、コールバック関数の最初の引数でjQuery.Eventオブジェクトを受け取ることができます。このオブジェクトを使って、規定のイベント動作のキャンセルや、バブリングの抑制などを行います。
  * function blur()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=83003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=83003
*/
jQuery.prototype.blur=function(){};
/**
  * 各要素のchangeイベントに関数をbindします。
  * changeイベントは通常、フォーカスを失った状態のinput要素がフォーカスを得て、値の変更を完了した時に実行されます。
  * jQueryのイベントは、コールバック関数の最初の引数でjQuery.Eventオブジェクトを受け取ることができます。このオブジェクトを使って、規定のイベント動作のキャンセルや、バブリングの抑制などを行います。
  * function change()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=130001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=130001
*/
jQuery.prototype.change=function(){};
/**
  * 各要素のclickイベントに関数をbindします。
  * clickイベントは通常、要素がマウスなどのポインティングデバイスでクリックされた場合に呼び出されます。
  * クリックは、mousedownとmouseupの組み合わせで定義されます。これらのイベントの実行順は、以下のようになります。
  * mousedown
  * mouseup
  * click
  * jQueryのイベントは、コールバック関数の最初の引数でjQuery.Eventオブジェクトを受け取ることができます。このオブジェクトを使って、規定のイベント動作のキャンセルや、バブリングの抑制などを行います。
  * function click()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=84002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=84002
*/
jQuery.prototype.click=function(){};
/**
  * 各要素のdblclickイベントに関数をbindします。
  * dblclickイベントは通常、要素がマウスなどのポインティングデバイスでダブルクリックされた場合に呼び出されます。
  * jQueryのイベントは、コールバック関数の最初の引数でjQuery.Eventオブジェクトを受け取ることができます。このオブジェクトを使って、規定のイベント動作のキャンセルや、バブリングの抑制などを行います。
  * function dblclick()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=86003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=86003
*/
jQuery.prototype.dblclick=function(){};
/**
  * jQuery 1.3より実装。
  * live関数と対になり、登録されたイベントを削除します。
  * 引数がまったく省略された場合、全てのliveイベントを削除します。
  * live関数で登録した、カスタムイベントも削除されます。
  * typeのみを指定した場合、そのtypeのイベントが全ての要素から削除されます。
  * 第二引数にliveで登録した関数を指定した場合、その関数だけが削除されます。
  * function die()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=120002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=120002
*/
jQuery.prototype.die=function(){};
/**
  * 各要素のerrorイベントに関数をbindします。
  * errorイベントは標準実装では存在しません。しかし多くのブラウザでは、JavaScriptがページ内で何らかのエラーを検知した際にこのイベントを発生させます。例えばimg要素でsrc属性に存在しない画像のパスや壊れた画像を指定した場合などに、errorイベントが発生します。
  * ブラウザのwindowオブジェクトからエラーが投げられた場合、イベントハンドラは関数に3つの引数を渡します。
  * 発生したエラーを説明する文字列(“varName is not defined”、”missing operator in expression”など)
  * エラーが発生したページのURL
  * エラーを検出した行番号
  * コールバック関数がtrueを返す場合、それはエラーが関数内で処理された合図となり、ブラウザはエラーとして処理しません。
  * 各ブラウザのエラー処理に関する更に詳細な動作については、以下を参照してください。
  * msdn - onerror Event
  * Gecko DOM Reference - onerror Event
  * Gecko DOM Reference - Event object
  * Wikipedia: DOM Events
  * function error()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=87003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=87003
*/
jQuery.prototype.error=function(){};
/**
  * 各要素のfocusイベントに関数をbindします。
  * focusイベントは通常、マウスなどのポインティングデバイスやタブキーで要素がフォーカスを受け取った際に呼び出されます。
  * jQueryのイベントは、コールバック関数の最初の引数でjQuery.Eventオブジェクトを受け取ることができます。このオブジェクトを使って、規定のイベント動作のキャンセルや、バブリングの抑制などを行います。
  * function focus()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=88003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=88003
*/
jQuery.prototype.focus=function(){};
/**
  * マウスホバーの動きをシミュレートします。
  * マウスカーソルが要素の上に乗った時に、第一引数に渡した関数を実行します。マウスが要素から外れた時には第二引数が実行されます。要素内にある他の要素上にマウスカーソルが入った場合にも、マウスは”out”にならず、”over”のままです。例えばAというdiv内にBというimgがある場合、B上にカーソルが入ってもAのoutは発生しません。これはdivのmouseoutイベントを用いた場合とは違う動作になるので注意してください。
  * function hover()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=131001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=131001
*/
jQuery.prototype.hover=function(){};
/**
  * 各要素のkeydownイベントに関数をbindします。
  * keydownイベントは通常、キーボードの何かのキーが押し込まれた際に呼び出されます。
  * jQueryのイベントは、コールバック関数の最初の引数でjQuery.Eventオブジェクトを受け取ることができます。このオブジェクトを使って、規定のイベント動作のキャンセルや、バブリングの抑制などを行います。
  * function keydown()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=132001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=132001
*/
jQuery.prototype.keydown=function(){};
/**
  * 各要素のkeypressイベントに関数をbindします。
  * keypressイベントは通常、キーボードのキーが押された際に呼び出されます。
  * keydownとkeyupの組み合わせがkeypressになります。キーが叩かれた際の各イベントは、次の順番で呼ばれます。
  * keydown
  * keyup
  * keypress
  * jQueryのイベントは、コールバック関数の最初の引数でjQuery.Eventオブジェクトを受け取ることができます。このオブジェクトを使って、規定のイベント動作のキャンセルや、バブリングの抑制などを行います。
  * function keypress()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=133001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=133001
*/
jQuery.prototype.keypress=function(){};
/**
  * 各要素のkeyupイベントに関数をbindします。
  * keyupイベントは通常、キーボードのキーが押され、上がった際に呼び出されます。
  * jQueryのイベントは、コールバック関数の最初の引数でjQuery.Eventオブジェクトを受け取ることができます。このオブジェクトを使って、規定のイベント動作のキャンセルや、バブリングの抑制などを行います。
  * function keyup()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=91002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=91002
*/
jQuery.prototype.keyup=function(){};
/**
  * jQuery 1.3より実装。
  * イベントに対してハンドラを登録します。
  * 登録されたイベントは、現在および将来的にも、セレクタにマッチする全ての要素に適用されます。
  * カスタムイベントに対してbindすることも可能です。
  * この関数で指定できるイベントは、次の通りです:
  * click, dblclick, mousedown, mouseup, mousemove, mouseover, mouseout, keydown, keypress, keyup
  * 現時点ではサポートしていないイベントは、次の通りです:
  * blur, focus, mouseenter, mouseleave, change, submit
  * bindとほぼ同様の関数ですが、ハンドラ登録時にマッチする要素だけでなく、永続的にイベント発生時点でマッチする要素に反応する点が異なります。
  * 例えばli要素に対してclickイベントを登録した場合、bindであれば、その時点でページ上に存在するli要素に対してイベントが登録されるだけでした。しかしliveでは、その後で動的にli要素が追加された場合も、そのli要素でのクリックに対してハンドラが実行されます。
  * この関数は、既にプラグインとして広く使われているliveQueryと似た動きをしますが、いくつかの大きな違いがあります。
  * live関数がサポートするのは、イベントのうちの一部のみ（上記サポート/非サポートリスト参照）
  * liveQueryがしているような、イベントスタイルでないコールバック関数のサポートはしていない
  * live関数には、setupやcleanupといった手順が必要ない
  * liveで設定したイベントを削除するには、die関数を用います。
  * function live()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=134001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=134001
*/
jQuery.prototype.live=function(){};
/**
  * 各要素のloadイベントに関数をbindします。
  * jQueryのイベントは、コールバック関数の最初の引数でjQuery.Eventオブジェクトを受け取ることができます。このオブジェクトを使って、規定のイベント動作のキャンセルや、バブリングの抑制などを行います。
  * function load()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=81001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=81001
*/
jQuery.prototype.load=function(){};
/**
  * 各要素のmousemoveイベントに関数をbindします。
  * mousemoveイベントは通常、マウスなどのポインティングデバイスが要素上で動いた際に呼び出されます。
  * イベントハンドラはコールバック関数にイベントオブジェクトを渡します。イベントオブジェクトはclientX/clientYというプロパティを持ち、マウスカーソルの位置を取得できます。
  * jQueryのイベントは、コールバック関数の最初の引数でjQuery.Eventオブジェクトを受け取ることができます。このオブジェクトを使って、規定のイベント動作のキャンセルや、バブリングの抑制などを行います。
  * function mousemove()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=90002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=90002
*/
jQuery.prototype.mousemove=function(){};
/**
  * 各要素のイベントに、1度だけ呼び出される関数をbindします。
  * 登録したコールバック関数は、各要素で1度だけ呼び出されます。それ以外の動作については、bind関数と同じです。
  * イベントハンドラにはeventオブジェクトが渡され、イベントやバブリングをキャンセルすることができます。あるいは、戻り値にfalseを返すことで両方をキャンセルすることが可能です。
  * 多くの場合、コールバック関数は無名関数で作成できるでしょう。それが不可能な場合は関数ポインタを渡すことになりますが、その場合は第二引数を用いて追加データを受け渡すことが可能です。（その場合、関数ポインタは第三引数になります）
  * function one()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=106003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=106003
*/
jQuery.prototype.one=function(){};
/**
  * DOMがロードされて操作・解析が可能になったタイミングで関数を実行します。
  * これはおそらく、最も重要なイベントになります。殆ど全てのJavaScriptはDOMの準備が出来たタイミングで処理を実行したいと思いますが、 window.onloadでは画像などのロードが済む時点にタイミングを合わせるブラウザもあります。readyイベントを用いることで、アプリケーションの体感処理速度を大きく向上させることができます。
  * ready関数にコールバック関数を渡してやります。コールバック関数の引数に$エイリアスが来るので、これを用いることでグローバル名前空間での衝突を避けた安全なコードを書くことが出来ます。
  * この関数を使う場合、bodyのonloadイベントには何も書かないようにしてください。readyイベントが実行されなくなってしまいます。
  * $(document).readyを用いてもかまいません。複数の関数を登録した場合、登録した順に実行されます。
  * function ready()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=135001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=135001
*/
jQuery.prototype.ready=function(){};
/**
  * 各要素のscrollイベントに関数をbindします。
  * scrollイベントは、文書がスクロールした際に呼び出されます。
  * jQueryのイベントは、コールバック関数の最初の引数でjQuery.Eventオブジェクトを受け取ることができます。このオブジェクトを使って、規定のイベント動作のキャンセルや、バブリングの抑制などを行います。
  * function scroll()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=83002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=83002
*/
jQuery.prototype.scroll=function(){};
/**
  * 各要素のselectイベントに関数をbindします。
  * selectイベントは通常、テキストエリアの文字列を選択状態にしたり、選択範囲を変更した際に呼び出されます。
  * jQueryのイベントは、コールバック関数の最初の引数でjQuery.Eventオブジェクトを受け取ることができます。このオブジェクトを使って、規定のイベント動作のキャンセルや、バブリングの抑制などを行います。
  * function select()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=91003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=91003
*/
jQuery.prototype.select=function(){};
/**
  * 各要素のsubmitイベントに関数をbindします。
  * submitイベントは通常、フォームがsubmitされた際に呼び出されます。
  * jQueryのイベントは、コールバック関数の最初の引数でjQuery.Eventオブジェクトを受け取ることができます。このオブジェクトを使って、規定のイベント動作のキャンセルや、バブリングの抑制などを行います。
  * function submit()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=87005">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=87005
*/
jQuery.prototype.submit=function(){};
/**
  * 要素がクリックされる毎に、引数で渡した関数を順番に呼び出します。
  * 最初に要素をクリックすると、第一引数に渡した関数が実行されます。もう1度クリックすると、第二引数に渡した関数が実行されます。以降、クリックされる度に関数が順に実行され、最後まで行くと最初の関数が実行されます。
  * jQuery1.2.6から、この関数は複数の引数を取れるようになりました。
  * それ以前のバージョンでは、引数は最初の2つだけが有効です。
  * また、この関数を設定した後で削除するには、unbind("click")である必要がありました。
  * これも1.2.6以降では、直接unbind("toggle")とすることが可能になっています。
  * function toggle()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=81003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=81003
*/
jQuery.prototype.toggle=function(){};
/**
  * 各要素の指定されたイベントを実行します。
  * この関数を実行すると、指定されたイベントそのものの動作と、登録されたイベントハンドラの呼び出しを共に行います。例えば”submit”を呼び出した場合、そのformのsubmit処理が実際に実行されます。この動作は例で言えばsubmitボタンが押された場合と全く同じで、コールバック関数内の戻り値にfalseを返すなどの処理でキャンセルすることも可能です。
  * デフォルトで存在するイベントだけでなく、bindで登録したカスタムイベントなども呼び出すことが出来ます。
  * イベントハンドラは、標準化されたイベントオブジェクトを受け取ることができます。ただし、これはブラウザによる独自のプロパティ（keyCode、pageX、pageYなど）は保持していません。
  * また、jQueryはNamespaced Events (名前空間付きイベント)を実装しています。
  * これにより、triggerやunbindをまとまった単位で処理することができるようになりました。
  * イベント名の末尾に「!」を付けると、名前空間を持っていないハンドラだけを指定することになります。
  * jQuery 1.3からは、イベントがDOMツリーをbubble upするようになりました。
  * 例えばドキュメント内に次のような階層があった場合、
  * <html><body>
  * <h1>title</h1>
  * <div>
  * <p>abc<span>xyz</span></p>
  * </div>
  * </body></html>xyzをクリックすれば、まずイベントは当然ながらspan要素で発生します。その後、ツリーを親の方に辿ってp、divとクリックイベントを発生させていきます。（h1は親子関係が無いので、発生しません）
  * abcをクリックした場合も同様ですが、spanタグにあるxyzは子要素なので、バブリングは伝播しません。
  * この処理を止めるには、イベントハンドラ内でjQuery.Eventオブジェクトを使い、stopPropagation()関数でバブリングを中断してやります。
  * jQueryのイベントオブジェクトは公開され、開発者が独自のオブジェクトを作ることが出来るようになりました。
  * イベントオブジェクトの詳細については、jQuery.Eventを参照して下さい。
  * function trigger()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=136001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=136001
*/
jQuery.prototype.trigger=function(){};
/**
  * 各要素の指定されたイベントにひもづけられた、コールバック関数のみを実行します。
  * trigger関数との違いは、ブラウザのデフォルトの動作を行わない点だけです。
  * function triggerHandler()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=137001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=137001
*/
jQuery.prototype.triggerHandler=function(){};
/**
  * bind関数とは反対に、各要素のイベントに関連付けられた関数を削除します。
  * 引数を全て省略した場合、全ての要素から全イベントが削除されます。
  * 第一引数にイベント名が指定された場合、そのイベントに関連付けられた関数だけが削除されます。
  * 第二引数に関数ポインタを渡した場合、指定イベントに結び付けられた、指定の関数のみが削除されます。
  * bindしたカスタムイベントを削除することも可能です。
  * function unbind()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=138001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=138001
*/
jQuery.prototype.unbind=function(){};
/**
  * 各要素のunloadイベントに関数をbindします。
  * jQueryのイベントは、コールバック関数の最初の引数でjQuery.Eventオブジェクトを受け取ることができます。このオブジェクトを使って、規定のイベント動作のキャンセルや、バブリングの抑制などを行います。
  * function unload()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=95002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=95002
*/
jQuery.prototype.unload=function(){};
/**
  * 要素に紐づいたデータを設定し、新たに設定された値を返します。
  * このAPIは、要素ごとに付随した情報を持たせたい場合などに非常に有用です。
  * 例えば地図上にマーカーを配置するような場合、マーカーとして用いるimg要素にデータを付随させることで、特別な拡張が無くても様々な情報を保持させることができます。
  * ここで設定する値は文字列には限らず、数値や配列など、どんな型であっても受け入れられます。
  * プラグインで要素に固有の値を持たせる場合、コンフリクトしないようにプラグイン名を用いて、オブジェクトでデータを保持するのが良いでしょう。
  * var obj = jQuery.data($("#target").get(0), "your_plugin_name", { ... });
  * function data()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=78001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=78001
*/
jQuery.prototype.data=function(){};
/**
  * 要素に関連付けられた、指定された名前の値を返します。
  * ここで指定する要素は、あくまでDOMの要素であることに注意して下さい。
  * 操作中の要素がjQueryオブジェクトである場合、get()などを用いてDOM要素を抽出する必要があります。
  * function data()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=78001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=78001
*/
jQuery.prototype.data=function(){};
/**
  * 要素ごとに一意にふられたIDを返します。
  * この関数は、主に内部的な処理に用いられます。
  * 一連のdata APIの処理中で必要に応じて呼ばれ、その際に自動的にIDを割り振ります。
  * このAPIが返すIDは、いわゆる(X)HTMLが持つID属性とは全く別のものです。
  * 指定するものではなく、あくまで内部的に要素をユニークに指定するためのものであることに注意して下さい。
  * function data()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=78001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=78001
*/
jQuery.prototype.data=function(){};
/**
  * form要素やオブジェクトの値をシリアライズします。
  * この関数は.serialize()のコアにあたるものですが、単体で個別に使っても有用な場面があるでしょう。
  * function param()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=108002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=108002
*/
jQuery.prototype.param=function(){};
/**
  * ある要素に関連付けられた、指定された値を削除します。
  * function removeData()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=99004">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=99004
*/
jQuery.prototype.removeData=function(){};
/**
  * ある要素に関連付けられたデータを全て削除します。
  * function removeData()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=99004">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=99004
*/
jQuery.prototype.removeData=function(){};
/**
  * 各要素の後ろにコンテンツを挿入する。
  * function after()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=122002">More</a><br/>
  * @param {String,Element,jQuery} content

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=122002
*/
jQuery.prototype.after=function(content){};
/**
  * 各要素に引数で指定したコンテンツを追加する。
  * これは、全ての要素に対して appendChild を行うことに近く、操作後はDOMに要素が追加された状態になる。
  * function append()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=76003">More</a><br/>
  * @param {String,Element,jQuery} contents

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=76003
*/
jQuery.prototype.append=function(contents){};
/**
  * 要素の中身を他の要素に追加する。
  * 例えば $(A).append(B) とした場合にAにBが追加されるのに対して、$(A).appendTo(B) ではBにAが追加される。
  * 両方のサンプルを見て、違いに注意すること。
  * function appendTo()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=123002">More</a><br/>
  * @param {String} contents

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=123002
*/
jQuery.prototype.appendTo=function(contents){};
/**
  * 各要素の前にコンテンツを挿入する。
  * function before()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=140001">More</a><br/>
  * @param {String,Element,jQuery} content

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=140001
*/
jQuery.prototype.before=function(content){};
/**
  * 要素のクローンを作成し、そのクローンを選択状態にする。
  * この関数は、ある要素のコピーを作成してDOMの他の場所に配置する際に便利である。
  * function clone()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=106003">More</a><br/>
  * @param {Boolean} t

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=106003
*/
jQuery.prototype.clone=function(t){};
/**
  * 要素のクローンを作成し、そのクローンを選択状態にする。
  * この関数は、ある要素のコピーを作成してDOMの他の場所に配置する際に便利である。
  * function clone()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=106003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=106003
*/
jQuery.prototype.clone=function(){};
/**
  * 各要素の子要素を全て削除し、空にする。
  * 同時にイベントハンドラや内部でキャッシュしているデータも削除する。
  * function empty()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=125002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=125002
*/
jQuery.prototype.empty=function(){};
/**
  * 要素を指定した他の要素の後に挿入する。
  * 例えば $(A).after(B) とした場合にAの後にBが挿入されるのに対して、$(A).insertAfter(B) ではBの後にAが挿入される。
  * 両方のサンプルを見て、違いに注意すること。
  * function insertAfter()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=141001">More</a><br/>
  * @param {String} content

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=141001
*/
jQuery.prototype.insertAfter=function(content){};
/**
  * 要素を指定した他の要素の前に挿入する。
  * 例えば $(A).before(B) とした場合にAの前にBが挿入されるのに対して、$(A).insertBefore(B) ではBの前にAが挿入される。
  * 両方のサンプルを見て、違いに注意すること。
  * function insertBefore()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=75003">More</a><br/>
  * @param {String} content

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=75003
*/
jQuery.prototype.insertBefore=function(content){};
/**
  * 引数で指定したコンテンツを各要素の先頭に挿入する。
  * function prepend()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=142001">More</a><br/>
  * @param {String,Element,jQuery} contents

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=142001
*/
jQuery.prototype.prepend=function(contents){};
/**
  * 要素の中身を他の要素の先頭に挿入する。
  * 例えば $(A).prepend(B) とした場合にAにBが挿入されるのに対して、$(A).prependTo(B) ではBにAが挿入される。
  * 両方のサンプルを見て、違いに注意すること。
  * function prependTo()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=143001">More</a><br/>
  * @param {String} content

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=143001
*/
jQuery.prototype.prependTo=function(content){};
/**
  * 全ての要素をドキュメントから削除する。
  * この関数は、jQueryオブジェクトからは要素を削除しません。jQueryオブジェクト上では、引き続き要素の操作をすることが可能です。
  * ver1.2.2から、この関数はイベントハンドラや内部キャッシュデータも削除するようになります。ですので、
  * $("#foo").remove().appendTo("#bar");
  * というコードは、もし$(”#foo”)が持つイベントを失いたくないのであれば
  * $("#foo").appendTo("#bar");
  * のように記述しなければなりません。
  * 引数に選択条件式を指定することで、削除する要素を絞り込むことが可能です。
  * function remove()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=91001">More</a><br/>
  * @param {String} expr

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=91001
*/
jQuery.prototype.remove=function(expr){};
/**
  * セレクターで選択された要素を全て置き換える。
  * この関数はreplaceWithと引数の関係が逆になっているだけで、同じ動作をする。
  * function replaceAll()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=127002">More</a><br/>
  * @param {Selector} selecter

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=127002
*/
jQuery.prototype.replaceAll=function(selecter){};
/**
  * 全ての要素を、指定されたHTMLやDOM Elementで置き換える。
  * function replaceWith()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=128002">More</a><br/>
  * @param {String, Element, jQuery} content

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=128002
*/
jQuery.prototype.replaceWith=function(content){};
/**
  * 指定要素を、実行要素で囲む。
  * 例えば $(A).wrap(B) であれば、A要素をB要素で囲む。
  * function wrap()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=83004">More</a><br/>
  * @param {Element} elem

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=83004
*/
jQuery.prototype.wrap=function(elem){};
/**
  * 各要素を構造的に指定HTMLで囲む。
  * ドキュメントに追加構造を差し込む際に、その論理的な構成を崩さずに操作を行うことが出来る。
  * この関数は、渡されたHTMLをその場で解析し、最初の要素から最も深い階層を捜して、そこへ指定要素を挟み込む。
  * 引数に指定するHTMLがテキストを含んでいる場合、この関数はうまく動作しない。その場合はwrap関数実行後にテキスト追加を行うこと。
  * また、指定HTMLが兄弟構造を持っていたり、逆にwrapされる要素が入れ子関係にあると上手く動作しない。
  * function wrap()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=83004">More</a><br/>
  * @param {String} html

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=83004
*/
jQuery.prototype.wrap=function(html){};
/**
  * wrapAll(html)と同様だが、HTML文字列ではなくDOM Elementなどを指定する。
  * wrap(elem)関数との違いも、上記 wrapAll(html) を参照のこと。
  * function wrapAll()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=117002">More</a><br/>
  * @param {Element} elem

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=117002
*/
jQuery.prototype.wrapAll=function(elem){};
/**
  * 要素集合をまとめて、指定HTML内に1つにまとめて挟み込む。
  * wrapAllとwrapの違いは、各要素に対してそれぞれwrap処理を行うか、全てをひとつにまとめるかの違いである。
  * ドキュメントに追加構造を差し込む際に、その論理的な構成を崩さずに操作を行う最良の方法である。
  * この関数は、渡されたHTMLをその場で解析し、最初の要素から最も深い階層を捜して、そこへ指定要素を挟み込む。
  * function wrapAll()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=117002">More</a><br/>
  * @param {Element} html

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=117002
*/
jQuery.prototype.wrapAll=function(html){};
/**
  * 各要素の子要素を、引数で渡された要素で囲む。
  * function wrapInner()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=83004">More</a><br/>
  * @param {Element} elem

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=83004
*/
jQuery.prototype.wrapInner=function(elem){};
/**
  * 各要素の子要素を、HTMLで作成した要素で囲む。
  * function wrapInner()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=83004">More</a><br/>
  * @param {String} html

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=83004
*/
jQuery.prototype.wrapInner=function(html){};
/**
  * ドット(.)で始まるセレクターは、クラス名と合致します。
  * Property class
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=84001">More</a><br/>
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=84001
*/
jQuery.prototype.class="";
/**
  * 何もプレフィックスの付かないセレクターは、タグ名と合致します。
  * Property element
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=106001">More</a><br/>
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=106001
*/
jQuery.prototype.element="";
/**
  * 合致させるHTMLの文字列,Elementなど
  * function add()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=84001">More</a><br/>
  * @param {String,DOM Element,Array} expr

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=84001
*/
jQuery.prototype.add=function(expr){};
/**
  * 現在の要素に加えて、ひとつ前の状態の要素集合を選択。
  * 一つ前の選択状態に加え、更に幾つかの要素を絞り込んで同時に処理することが出来る。
  * function andSelf()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=140002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=140002
*/
jQuery.prototype.andSelf=function(){};
/**
  * 要素内の全ての子要素を選択する。選択される要素は直下にある子要素のみで、孫要素以下は対象外となる。
  * この関数は、条件式を渡して選択される子要素を更に絞り込むことも可能。
  * parents()関数が先祖まで辿って行くのに対し、children()関数は直下の子要素のみ選択する。
  * function children()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=97004">More</a><br/>
  * @param {String} expr

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=97004
*/
jQuery.prototype.children=function(expr){};
/**
  * jQuery 1.3より。
  * 開始要素から最も近い親要素を選択します。引数にセレクター書式を指定した場合、マッチする最も近い親要素を返します。
  * フィルタにマッチすれば、開始要素そのものが返る場合もあります。
  * ルートドキュメントまで辿ってもマッチする要素が無い場合、戻り値はnoneになります。
  * closestは、特にイベント操作で便利です。
  * function closest()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=98006">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=98006
*/
jQuery.prototype.closest=function(){};
/**
  * 要素のテキストノードも含めた全子要素を取得します。対象要素がiframeであれば、呼び出されるコンテンツのDocumentを選択する。
  * function contents()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=76003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=76003
*/
jQuery.prototype.contents=function(){};
/**
  * jQueryオブジェクトを連鎖的に呼び出していった際に、現在の選択状態を破棄して1つ前の状態に戻します。
  * 1つ前の状態が無い場合、空の選択状態が返ってきます。
  * 状態を戻せるのは全てのjQueryオブジェクトを返すTarversing関数で、以下のようなものが挙げられます。
  * add
  * andSelf
  * children
  * filter
  * find
  * map
  * next
  * nextAll
  * not
  * parent
  * parents
  * prev
  * prevAll
  * siblings
  * slice
  * これらに加えて、Manipulation関数であるclone関数などにも用いることができます。
  * また、次の関数も対象となっています。
  * clone
  * appendTo
  * prependTo
  * insertBefore
  * insertAfter
  * replaceAll
  * この関数は、連鎖関数をブロック要素的に利用するためのものだと捉えると判り易いでしょう。
  * function end()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=76003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=76003
*/
jQuery.prototype.end=function(){};
/**
  * 要素集合から引数にインデックスを指定し、ひとつだけの要素を選択する。
  * インデックスは0から全要素数-1までの連番。
  * function eq()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=93003">More</a><br/>
  * @param {Number} index

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=93003
*/
jQuery.prototype.eq=function(index){};
/**
  * 要素集合から、引数で渡す条件式に合致しない全ての要素を削除したものを返す。
  * この関数は、抽出結果を更に絞り込むために用いられる。
  * 条件式には、カンマ区切りで指定することで複数のフィルタを同時にかけることが可能。
  * function filter()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=108003">More</a><br/>
  * @param {Number} index

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=108003
*/
jQuery.prototype.filter=function(index){};
/**
  * 要素集合から、引数で渡したコールバック関数で合致と判定しなかった要素を全て削除したものを返す。
  * この関数は、全ての要素に対して $.each のように順に実行されます。この時にfalseを返せば、その要素は集合から外される。
  * false以外の値を返せば、その要素は残る。
  * function filter()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=108003">More</a><br/>
  * @param {Function} fn

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=108003
*/
jQuery.prototype.filter=function(fn){};
/**
  * 指定要素が持つ全子孫要素から、指定条件式に合致するものを選択する。
  * この関数は、処理中の要素から更に絞込みをかけるのに便利である。
  * 条件式はjQueryのセレクター書式で記述されますが、CSS1-3のセレクター書式でも可能。
  * function find()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=139003">More</a><br/>
  * @param {String} expr

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=139003
*/
jQuery.prototype.find=function(expr){};
/**
  * 要素集合全てのうちから、引数に指定したクラスを持つ要素がひとつでもあればtrueを返す。
  * これは、is(”.”+class) と同じ動作である。
  * function hasClass()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=122003">More</a><br/>
  * @param {String} class

  * @returns {Boolean}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=122003
*/
jQuery.prototype.hasClass=function(class){};
/**
  * 要素集合のうち、1つでも条件式に合致する要素があればtrueを返します。
  * もし何の要素も一致しないか、条件式が不正であればfalseが返されます。
  * jQuery 1.3からは、引数に全てのセレクター書式が指定できるようになりました。例えば"+"や"~"、">"のような以前は常にtrueを返していた階層構造を示す書式も、きちんと評価されます。
  * 内部的にfilterを使っているので、条件式のルールは同じになります。
  * function is()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=90003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=90003
*/
jQuery.prototype.is=function(){};
/**
  * jQueryオブジェクトが持つ要素集合を、elementなどの他の値の配列に変換する。
  * この機能を使って、valueや属性、cssなど様々な値の配列を作ることが出来る。
  * この関数は、$.map()の形で呼び出すことも可能。
  * function map()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=91006">More</a><br/>
  * @param {Function} callback

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=91006
*/
jQuery.prototype.map=function(callback){};
/**
  * 要素集合の各要素の「次」にあたる兄弟要素を、全て抽出する。
  * このnext関数はあくまで各要素のすぐ隣の要素のみを抽出し、次以降を選択するのではない。その場合はnextAllを用いること。
  * 引数には条件式を指定し、結果セットから更に絞込みを行うことも可能。
  * function next()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=105004">More</a><br/>
  * @param {String} expr

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=105004
*/
jQuery.prototype.next=function(expr){};
/**
  * 現在の要素の次以降にある兄弟要素を全て返す。
  * 条件式を渡して要素を絞り込むことも可能。
  * function nextAll()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=110004">More</a><br/>
  * @param {String} expr

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=110004
*/
jQuery.prototype.nextAll=function(expr){};
/**
  * 要素集合から指定した条件式に合致する要素を削除する。
  * function not()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=106004">More</a><br/>
  * @param {String} expr

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=106004
*/
jQuery.prototype.not=function(expr){};
/**
  * 各要素の親要素を全て返す。
  * 引数に選択条件式を指定することで、更に絞り込むことも可能。
  * function parent()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=82002">More</a><br/>
  * @param {String} expr

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=82002
*/
jQuery.prototype.parent=function(expr){};
/**
  * 各要素の先祖要素を全て返す。
  * parent()関数が親のみを返すのに対し、parents()はルートを除く先祖要素を全て返す。
  * 引数に選択条件式を指定することで、更に絞り込むことも可能。
  * function parents()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=141002">More</a><br/>
  * @param {String} expr

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=141002
*/
jQuery.prototype.parents=function(expr){};
/**
  * 要素集合の各要素の「前」にあたる兄弟要素を、全て抽出する。
  * このprev関数はあくまで各要素のすぐ隣の要素のみを抽出し、前以前を全て選択するわけではない。その場合はprevAll()を用いること。
  * 引数には条件式を指定し、結果セットから更に絞込みを行うことも可能。
  * function prev()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=75004">More</a><br/>
  * @param {String} expr

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=75004
*/
jQuery.prototype.prev=function(expr){};
/**
  * 現在の要素の前以前にある兄弟要素を全て返す。
  * 条件式を渡して要素を絞り込むことも可能。
  * function prevAll()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=142002">More</a><br/>
  * @param {String} expr

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=142002
*/
jQuery.prototype.prevAll=function(expr){};
/**
  * 各要素の兄弟要素を全て返す。
  * 条件式を渡して要素を絞り込むことも可能。
  * function siblings()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=111003">More</a><br/>
  * @param {String} expr

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=111003
*/
jQuery.prototype.siblings=function(expr){};
/**
  * 要素集合から指定範囲のものを返す。
  * Javascriptに標準で組み込まれている、配列に対するslice関数と同じ動作である。
  * function slice()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=77002">More</a><br/>
  * @param {Ineger} start
  * @param {Ineger} end

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=77002
*/
jQuery.prototype.slice=function(start,end){};
/**
  * jQuery 1.3からはサポート外。jQuery.supportを使って下さい。
  * ユーザのブラウザが、現在のページを表示するのにW3C CSS Box Modelを使用しているかどうかを保持します。
  * Property boxModel
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=112003">More</a><br/>
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=112003
*/
jQuery.prototype.boxModel="";
/**
  * ※jQuery 1.3からはサポート外。jQuery.supportを使って下さい。
  * navigator.userAgentを元に、ユーザエージェントを識別するためのフラグを連想配列として保持しています。
  * 現時点で有効なフラグは次の通りです。
  * safari
  * opera
  * msie
  * mozilla
  * このプロパティはDOMがready状態になる以前から使えるので、例えば特定のブラウザに対してだけreadyイベントに処理を追加するような条件分岐も可能です。
  * この値は、オブジェクトによる対応調査だけでは信頼しきれない場合に用いると良いでしょう。両者を組み合わせて判別すれば、信頼性はかなり増します。
  * Property browser
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=113003">More</a><br/>
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=113003
*/
jQuery.prototype.browser="";
/**
  * ※jQuery 1.3からはサポート外。jQuery.supportを使って下さい。
  * 現在使用中のブラウザが持つレンダリングエンジンのバージョン番号を持ちます。
  * 例えば、次のような値になるでしょう。
  * Internet Explorer: 6.0, 7.0
  * Mozilla/Firefox/Flock/Camino: 1.7.12, 1.8.1.12
  * Opera: 9.20
  * Safari/Webkit: 312.8, 418.9
  * Property browser.version
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=114003">More</a><br/>
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=114003
*/
jQuery.prototype.browser.version="";
/**
  * 配列/オブジェクトを問わずに汎用的に用いることができる、繰り返し処理用の関数です。
  * この関数は、jQueryオブジェクトのプロトタイプに実装されている $().each() とは異なります。こちらは、引数で渡した単なる配列やjQueryでないオブジェクトも繰り返し操作することができます。
  * コールバック関数は2つの引数を持ちます。
  * 1番目はオブジェクトであればハッシュKEY、配列であればインデックスを受け取ります。
  * 2番目には、値が受け渡されます。
  * 繰り返し処理中にループを抜けたい場合（一般的なループ処理で言うところのbreak）、コールバック関数でfalseを返すことで実装できます。それ以外の値を返した場合は、無視されます。
  * function each()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=100001">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=100001
*/
jQuery.prototype.each=function(){};
/**
  * 配列中から、フィルタ関数を指定して特定の値だけを残した配列を返します。
  * コールバックされるフィルタ関数は、2つの引数を受け取ります。
  * 1番目に渡されるのは、配列中の値そのものです。
  * 2番目に渡されるのは、配列のインデックスです。
  * 関数は受け取った値を配列中に残したければtrueを、除去したければfalseを返す必要があります。
  * 但し、grep関数の第三引数のinvertにtrueを指定するとこの動作は逆になり、trueが除去、falseが残す処理になります。
  * function grep()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=89006">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=89006
*/
jQuery.prototype.grep=function(){};
/**
  * 第一引数に渡した値が配列中にあれば、そのインデックスを返します。
  * 例え該当する値が複数あっても、最初に見つかった時点でその値を戻します。
  * 値が配列中に見つからない場合は、-1を返します。
  * function inArray()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=131002">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=131002
*/
jQuery.prototype.inArray=function(){};
/**
  * jQuery 1.3より追加。
  * 引数で渡された値が配列であるかどうかを判別します。
  * function isArray()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=90003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=90003
*/
jQuery.prototype.isArray=function(){};
/**
  * 渡された値が関数かどうかを判別します。
  * function isFunction()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=135003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=135003
*/
jQuery.prototype.isFunction=function(){};
/**
  * オブジェクトを、配列に変換します。
  * 対象になるオブジェクトはlengthプロパティを持ち、保持しているプロパティが0からlength-1であるものです。典型的なものとしてはDOMのHTMLElementsなどが挙げられますが、通常の方法でjQueryを用いていれば特に使う必要は無いはずです。
  * function makeArray()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=133003">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=133003
*/
jQuery.prototype.makeArray=function(){};
/**
  * 配列の各値を関数で処理して、新たな配列を作成します。
  * 引数に渡した変換用の関数は、配列の要素数分呼び出されます。
  * 引数として値そのものとインデックスを受け取り、変換後の値を戻り値として返します。
  * コールバック関数が"null"を返すと、配列には何も追加されません。
  * 配列を返した場合、それらは2次配列ではなく配列に1次的に並べられます。
  * これらのことから、map処理後の配列は必ずしも元の配列と同じ要素数にはならないことになります。
  * function map()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=91006">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=91006
*/
jQuery.prototype.map=function(){};
/**
  * jQuery 1.3より。
  * ブラウザごとに異なる機能や、バグによって正常に動かない機能などの情報を返します。
  * jQueryが幾つかの機能について返しますが、自分の用途にあわせて自由にここにエントリを追加して下さい。
  * ここでjQueryが返すものの殆どは根本的なレベルのものなので、日々の開発において直接役立つものであるのかは疑わしいからです。
  * しかし、これらは開発の核になるものなので間接的には利用していることが多いでしょう。そういったものの組み合わせで、使い易いエントリを算出することが出来ると思います。
  * ブラウザごとの機能の違いは、各種調査に基づいています。この問題に関しては、例えば以下のサイトで詳しく説明されています。（英語）
  * http://peter.michaux.ca/articles/feature-detection-state-of-the-art-browser-scripting
  * http://yura.thinkweb2.com/cft/
  * http://www.jibbering.com/faq/faq_notes/not_browser_detect.html
  * jQuery.supportは、以下のようなエントリを持ちます。
  * boxModelブラウザがW3CのCSS Box Modelに従っていれば、trueを返します。例えばIE6/7でQuirks Modeを用いている場合、この値はfalseを返します。この値はdocument.readyが呼ばれる前には常にnullになっています。cssFloatfloatの値を取得する場合にstyle.cssFloatが使えればtrueを返します。例えば現時点でのIEではcssFloatではなくstyleFloatを用いるため、falseを返します。hrefNormalizedhrefの値を取得する際に、属性値をそのまま返す場合はtrueになります。現時点のIEではURLが標準化されるため、falseが返ります。htmlSerializeinnerHTMLを用いた際に、serializeされた値を返すならばtrueです。現時点のIEではfalseが返ります。leadingWhitespaceinnerHTMLで、先頭に空白があった場合にそれを残して返すブラウザであればtrueになります。IE6～8ではfalseになります。noCloneEvent要素をcloneした際に、元の要素が持っていたイベントハンドラも同時にコピーしないブラウザであればtrueになります。現時点のIEではfalseになります。objectAllgetElementsByTagName("*")を実行した際に、全ての要素を返す挙動をするブラウザであればtrueになります。現時点のIEではfalseになります。opacityopacityスタイルで透明度を指定する機能を実装しているブラウザであればtrueを返します。現時点のIEではopacityではなくalpha filterを用いるため、falseになります。scriptEvalappendChildやcreateTextNodeでdocumentを追加した際に、含まれるscriptを実行するブラウザであればtrueになります。現時点でのIEはfalseとなり、scriptを実行しながら追加したい場合は.textを用いることになります。stylegetAttribute("style")で要素に記述されたstyle属性値を取得できるブラウザであればtrueを返します。現時点のIEではfalseとなり、styleではなくcssTextを使います。tbodytableタグを用いる際に、tbody要素が無い状態を許可するブラウザであればtrueになります。現時点のIEではこれが許されておらず、タグ上にtbody要素が無かった場合は自動的に付加されるため、falseとなります。
  * Property support
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=131003">More</a><br/>
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=131003
*/
jQuery.prototype.support="";
/**
  * 文字列の先頭と末尾から、空白を除去します。
  * 渡された文字列から、正規表現で空白と見做されるものを除去します。
  * そのため、改行コードや全角のブランクであっても、空白として処理されます。
  * function trim()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=132005">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=132005
*/
jQuery.prototype.trim=function(){};
/**
  * 配列中から重複している値を除去し、ユニークになったものを返します。
  * function unique()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=133004">More</a><br/>

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=133004
*/
jQuery.prototype.unique=function(){};
/**
  * <div>Attach a function to be executed whenever an AJAX request completes. This is an Ajax Event.</div><div>The XMLHttpRequest and settings used for that request are passed as arguments to the callback.</div>
  * function ajaxComplete()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=91007">More</a><br/>
  * @param {Function} callback

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=91007
*/
jQuery.prototype.ajaxComplete=function(callback){};
/**
  * <div>Attach a function to be executed whenever an AJAX request fails. This is an Ajax Event.</div><div>The XMLHttpRequest and settings used for that request are passed as arguments to the callback. A third argument, an exception object, is passed if an exception occured while processing the request.</div>
  * function ajaxError()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=92004">More</a><br/>
  * @param {Function} callback

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=92004
*/
jQuery.prototype.ajaxError=function(callback){};
/**
  * <div>Attach a function to be executed before an AJAX request is sent. This is an Ajax Event.</div><div>The XMLHttpRequest and settings used for that request are passed as arguments to the callback.</div>
  * function ajaxSend()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=93004">More</a><br/>
  * @param {Function} callback

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=93004
*/
jQuery.prototype.ajaxSend=function(callback){};
/**
  * <div>Attach a function to be executed whenever an AJAX request begins and there is none already active. This is an Ajax Event.</div><div></div>
  * function ajaxStart()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=136003">More</a><br/>
  * @param {Function} callback

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=136003
*/
jQuery.prototype.ajaxStart=function(callback){};
/**
  * <div>Attach a function to be executed whenever all AJAX requests have ended. This is an Ajax Event.</div><div></div>
  * function ajaxStop()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=134003">More</a><br/>
  * @param {Function} callback

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=134003
*/
jQuery.prototype.ajaxStop=function(callback){};
/**
  * <div>Attach a function to be executed whenever an AJAX request completes successfully. This is an Ajax Event.</div><div>The event object, XMLHttpRequest, and settings used for that request are passed as arguments to the callback.</div>
  * function ajaxSuccess()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=137003">More</a><br/>
  * @param {Function} callback

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=137003
*/
jQuery.prototype.ajaxSuccess=function(callback){};
/**
  * <div>Setup global settings for AJAX requests.</div><div>See $.ajaxfor a description of all available options. Note: Do not set handlers for complete, error, or success functions with this method; use the global ajax events instead. </div>
  * function ajaxSetup()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=138002">More</a><br/>
  * @param {Options} options

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=138002
*/
jQuery.prototype.ajaxSetup=function(options){};
/**
  * <div>Load a remote page using an HTTP POST request.</div><div>This is an easy way to send a simple POST request to a server without having to use the more complex $.ajax function. It allows a single callback function to be specified that will be executed when the request is complete (and only if the response has a successful response code). <p>The returned data format can be specified by the fourth parameter.
  * If you need to have both error and success callbacks, you may want to use $.ajax. $.post is a (simplified) wrapper function for $.ajax. </p>$.post() returns the XMLHttpRequest that it creates. In most cases you won't need that object to manipulate directly, but it is available if you need to abort the request manually. </div>
  * function post()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=95004">More</a><br/>
  * @param {String} url
  * @param {Map, String} data
  * @param {Function} callback
  * @param {String} type

  * @returns {XMLHttpRequest}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=95004
*/
jQuery.prototype.post=function(url,data,callback,type){};
/**
  * <div>Returns value at named data store for the element, as set by data(name, value).</div><div><p>If the jQuery collection references multiple elements, the value returned refers to the first element.</p><p>This function is used to get stored data on an element without the risk of a circular reference.  It uses jQuery.dataand is new to version 1.2.3.  It can be used for many reasons and jQuery UI uses it heavily. </p></div>
  * Property data
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=78001">More</a><br/>
  * @type Any
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=78001
*/
jQuery.prototype.data="";
/**
  * <div>Stores the value in the named spot.</div><div><p>If the jQuery collection references multiple elements, the data element is set on all of them. A data value that is a Javascript object is not copied and will be shared across all elements in the collection.</p><p>This function can be useful for attaching data to elements without having to create a new expando.  It also isn't limited to a string.  The value can be any format.</p><p>It may also be used for getting events attached to elements, however this is unsupported. First paramater being the element, second being the string &quot;events&quot;</p></div>
  * Property data
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=78001">More</a><br/>
  * @type jQuery
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=78001
*/
jQuery.prototype.data="";
/**
  * <div>Removes named data store from an element.</div><div>This is the complement function to $(...).data(name, value).</div>
  * function removeData()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=99004">More</a><br/>
  * @param {String} name

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=99004
*/
jQuery.prototype.removeData=function(name){};
/**
  * <div>Binds a function to the mousedown event of each matched element.</div><div>The mousedown event fires when the pointing device button is pressed over an element.</div>
  * function mousedown()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=107004">More</a><br/>
  * @param {Function} fn

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=107004
*/
jQuery.prototype.mousedown=function(fn){};
/**
  * <div>Bind a function to the mouseenter event of each matched element.</div><div>The mouseenter event fires once when the pointing device is moved into an element. <p><br/></p>This convenience method was added in jQuery 1.3. Previously the mouseenter event was available via bind.</div>
  * function mouseenter()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=108004">More</a><br/>
  * @param {Function} fn

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=108004
*/
jQuery.prototype.mouseenter=function(fn){};
/**
  * <div>Bind a function to the mouseleave event of each matched element.</div><div>The mouseleave event fires once when the pointing device is moved away from an element. <p><br/></p>This convenience method was added in jQuery 1.3. Previously the mouseleave event was available via bind.</div>
  * function mouseleave()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=147002">More</a><br/>
  * @param {Function} fn

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=147002
*/
jQuery.prototype.mouseleave=function(fn){};
/**
  * <div>Bind a function to the mouseout event of each matched element.</div><div>The mouseout event fires when the pointing device is moved away from an element.</div>
  * function mouseout()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=102004">More</a><br/>
  * @param {Function} fn

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=102004
*/
jQuery.prototype.mouseout=function(fn){};
/**
  * <div>Bind a function to the mouseover event of each matched element.</div><div>The mouseover event fires when the pointing device is moved onto an element.</div>
  * function mouseover()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=139004">More</a><br/>
  * @param {Function} fn

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=139004
*/
jQuery.prototype.mouseover=function(fn){};
/**
  * <div>Bind a function to the mouseup event of each matched element.</div><div>The mouseup event fires when the pointing device button is released over an element.</div>
  * function mouseup()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=122004">More</a><br/>
  * @param {Function} fn

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=122004
*/
jQuery.prototype.mouseup=function(fn){};
/**
  * <div>Bind a function to the resize event of each matched element.</div><div>The resize event fires when a document view is resized</div>
  * function resize()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=103005">More</a><br/>
  * @param {Function} fn

  * @returns {jQuery}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=103005
*/
jQuery.prototype.resize=function(fn){};
/**
  * <div>Returns a jQuery collection with the positioned parent of the first matched element.</div><div>This is the first parent of the element that has position (as in relative or absolute). This method only works with visible elements.</div>
  * Property offsetParent
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=124004">More</a><br/>
  * @type jQuery
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=124004
*/
jQuery.prototype.offsetParent="";
/**
  * <div>Merge two arrays together.</div><div>The result is the altered first argument with the elements from the second array added. The arguments should be true Javascript Array objects; use jQuery.makeArray if they are not. To remove duplicate elements from the resulting array, use $.unique().</div>
  * function merge()
<br/><a  href="http://jquerysnippet.appspot.com/snippet.jsp?id=140003">More</a><br/>
  * @param {Array} first
  * @param {Array} second

  * @returns {Array}
  * @see http://jquerysnippet.appspot.com/snippet.jsp?id=140003
*/
jQuery.prototype.merge=function(first,second){};
/**
  * Add handlers to be called when the Deferred object is resolved.
  * function done()

  * @param {Function} doneCallbacks

  * @returns {jQuery}
*/
jQuery.prototype.done=function(doneCallbacks){};
/**
  * Add handlers to be called when the Deferred object is rejected.
  * function fail()

  * @param {Function} failCallbacks

  * @returns {jQuery}
*/
jQuery.prototype.fail=function(failCallbacks){};
/**
  * Determine whether a Deferred object has been rejected.
  * Returns true if the Deferred object is in the rejected state, meaning that either deferred.reject() or deferred.rejectWith() has been called for the object and the failCallbacks have been called (or are in the process of being called).
  * Note that a Deferred object can be in one of three states: unresolved, resolved, or rejected; use deferred.isResolved() to determine whether the Deferred object is in the resolved state. These methods are primarily useful for debugging, for example to determine whether a Deferred has already been resolved even though you are inside code that intended to reject it.
  * function isRejected()


  * @returns {Boolean}
*/
jQuery.prototype.isRejected=function(){};
/**
  * Determine whether a Deferred object has been resolved.
  * Returns true if the Deferred object is in the resolved state, meaning that either deferred.resolve() or deferred.resolveWith() has been called for the object and the doneCallbacks have been called (or are in the process of being called).
  * Note that a Deferred object can be in one of three states: unresolved, resolved, or rejected; use deferred.isRejected() to determine whether the Deferred object is in the rejected state. These methods are primarily useful for debugging, for example to determine whether a Deferred has already been resolved even though you are inside code that intended to reject it.
  * function isResolved()


  * @returns {Boolean}
*/
jQuery.prototype.isResolved=function(){};
/**
  * Return a Deferred's Promise object.
  * The deferred.promise() method allows an asynchronous function to prevent other code from interfering with the progress or status of its internal request. The Promise exposes only the Deferred methods needed to attach additional handlers or determine the state (then, done, fail, isResolved, and isRejected), but not ones that change the state (resolve, reject, resolveWith, and rejectWith).
  * If you are creating a Deferred, keep a reference to the Deferred so that it can be resolved or rejected at some point. Return only the Promise object via deferred.promise() so other code can register callbacks or inspect the current state.
  * function promise()


  * @returns {jQuery}
*/
jQuery.prototype.promise=function(){};
/**
  * Reject a Deferred object and call any failCallbacks with the given args.
  * function reject()


  * @returns {jQuery}
*/
jQuery.prototype.reject=function(){};
/**
  * Reject a Deferred object and call any failCallbacks with the given context and args.
  * Normally, only the creator of a Deferred should call this method; you can prevent other code from changing the Deferred's state by returning a restricted Promise object through deferred.promise().
  * When the Deferred is rejected, any failCallbacks added by deferred.then or deferred.fail are called. Callbacks are executed in the order they were added. Each callback is passed the args from the deferred.reject() call. Any failCallbacks added after the Deferred enters the rejected state are executed immediately when they are added, using the arguments that were passed to the .reject() call.
  * function rejectWith()

  * @param {Object} context
  * @param {Object} args

  * @returns {jQuery}
*/
jQuery.prototype.rejectWith=function(context,args){};
/**
  * Resolve a Deferred object and call any doneCallbacks with the given args.
  * When the Deferred is resolved, any doneCallbacks added by deferred.then or deferred.done are called. Callbacks are executed in the order they were added. Each callback is passed the args from the .resolve(). Any doneCallbacks added after the Deferred enters the resolved state are executed immediately when they are added, using the arguments that were passed to the .resolve() call.
  * function resolve()

  * @param {Object} args

  * @returns {jQuery}
*/
jQuery.prototype.resolve=function(args){};
/**
  * Resolve a Deferred object and call any doneCallbacks with the given context and args.
  * function resolveWith()

  * @param {Object} context
  * @param {Object} args

  * @returns {jQuery}
*/
jQuery.prototype.resolveWith=function(context,args){};
/**
  * Add handlers to be called when the Deferred object is resolved or rejected.
  * function then()

  * @param {Function} doneCallbacks
  * @param {Function} failCallbacks

  * @returns {jQuery}
*/
jQuery.prototype.then=function(doneCallbacks,failCallbacks){};
/**
  * The jQuery.hasData() method provides a way to determine if an element currently has any values that were set using jQuery.data(). If no data is associated with an element (there is no data object at all or the data object is empty), the method returns false; otherwise it returns true.
  * The primary advantage of jQuery.hasData(element) is that it does not create and associate a data object with the element if none currently exists. In contrast, jQuery.data(element) always returns a data object to the caller, creating one if no data object previously existed.
  * function hasData()

  * @param {DOMElement} element

  * @returns {Boolean}
*/
jQuery.prototype.hasData=function(element){};
/**
  * jQuery.parseXML uses the native parsing function of the browser to create a valid XML Document. This document can then be passed to jQuery to create a typical jQuery object that can be traversed and manipulated.
  * function parseXML()

  * @param {String} data

  * @returns {DOMElement}
*/
jQuery.prototype.parseXML=function(data){};
/**
  * There are two specific use cases for which jQuery.sub() was created. The first was for providing a painless way of overriding jQuery methods without completely destroying the original methods and another was for helping to do encapsulation and basic namespacing for jQuery plugins.
  * function sub()


  * @returns {jQuery}
*/
jQuery.prototype.sub=function(){};
/**
  * Provides a way to execute callback functions based on one or more objects, usually Deferred objects that represent asynchronous events.
  * function when()

  * @param {Object} deferreds

  * @returns {Object}
*/
jQuery.prototype.when=function(deferreds){};
/**
  * Add handlers to be called when the Deferred object is either resolved or rejected.
  * function always()

  * @param {Object} alwaysCallbacks

  * @returns {jQuery}
*/
jQuery.prototype.always=function(alwaysCallbacks){};
/**
  * The deferred.pipe() method returns a new promise that filters the status and values of a deferred through a function. The doneFilter and failFilter functions filter the original deferred's resolved / rejected status and values. These filter functions can return a new value to be passed along to the piped promise's done() or fail() callbacks, or they can return another observable object (Deferred, Promise, etc) which will pass its resolved / rejected status and values to the piped promise's callbacks. If the filter function used is null, or not specified, the piped promise will be resolved or rejected with the same values as the original.
  * function pipe()

  * @param {Object} doneFilter
  * @param {Object} failFilter

*/
jQuery.prototype.pipe=function(doneFilter,failFilter){};
/**
  * Holds or releases the execution of jQuery's ready event.
  * function holdReady()

  * @param {Boolean} hold

*/
jQuery.prototype.holdReady=function(hold){};
/**
  * Return a Promise object to observe when all actions of a certain type bound to the collection, queued or not, have finished.
  * function promise()

  * @param {String} type
  * @param {Object} target

  * @returns {jQuery}
*/
jQuery.prototype.promise=function(type,target){};
/**
  * Get the value of a property for the first element in the set of matched elements.
  * function prop()

  * @param {String} propertyName

  * @returns {String}
*/
jQuery.prototype.prop=function(propertyName){};
/**
  * Remove a property for the set of matched elements
  * function removeProp()

  * @param {String} propertyName
  * @param {Object} value

*/
jQuery.prototype.removeProp=function(propertyName,value){};

Window.$ = new jQuery();

 Window.$ = new jQuery();

Window.prototype.$ = new jQuery();


Global.prototype.$ = function(s) {
	 return new jQuery();
};

 //Window.prototype.createRequest=new function(){return new XMLHttpRequest();};

