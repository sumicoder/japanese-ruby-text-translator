# [日本語 Ruby テキスト翻訳ツール](http://japanese-ruby-text-translator.code-crane.com/)

このツールは、`<ruby></ruby><rt></rt>`で翻訳を瞬時に追加する時短ツールです。<br>
ふりがなが必要なページでは、英訳して閲覧するユーザーが多いことが想定された案件に出会ったときに工数削減のためアプリ開発しました。

## 概要

<!-- prettier-ignore-start -->
```html
<p>吾輩は猫である。名前はまだ無い。</p>
```
<!-- prettier-ignore-end -->

このようなテキストにルビ（ふりがな）を振ろうと思った時に以下のようにします。

<!-- prettier-ignore-start -->
```html
<p><span aria-hidden="true" translate="no"><ruby>吾輩<rt>わがはい</rt></ruby>は<ruby>猫<rt>ねこ</rt></ruby>である。<ruby>名前<rt>なまえ</rt></ruby>はまだ<ruby>無<rt>な</rt></ruby>い。</span><span translate="yes">吾輩は猫である。名前はまだ無い。</span></p>
```
<!-- prettier-ignore-end -->

手動でやろうと思ったら気が滅入ってしまいますね…。

---

## 特徴

-   入力したテキストから漢字を抽出して、ルビを振るべき漢字の候補を、赤く表示するので分かりやすいです。
-   AI（Gemini）を組み込めば、AI が漢字をある程度自動で抽出してくれるのでさらに**時短**できます。
-   プレビューもあるのでルビ振り忘れ防止になります。
-   漢字とふりがなのペアは、追加削除が自由にできます。
    -   AI で抽出した漢字も編集できます。
-   AI（Gemini）を組み込めば、漢字の入力欄をフォーカスするとふりがなの候補を出力してくれるのでさらに**時短**できます。
-   変換後のコードはワンクリックでコピーできるので**時短**できます。

---

## 使い方

### AI 無しの場合

1. テキスト入力欄にルビ振りを行いたいテキストを入力してください。
    - `<p></p>`の中身全てを入力することを推奨します。
2. 漢字候補の中からルビ振りをしたい漢字を単語入力欄に入力してください。
3. その単語のよみがなを記入してください。
    - かな/カナ/漢字全て対応しています。
    - 例）「決め手」→「`<ruby>決め手<rt>きめて</rt></ruby>`」
4. 青色の「単語を追加する」ボタンで追加できます。
5. 赤色の「×」ボタンで削除できます。
    - `position:absolute`にチェックを入れると後述するハック的な方法が使用できます。
6. 緑色の「ルビ振りテキストに変換する」ボタンを押すと`1`で入力したテキストから`2`で入力した文字列を探して`<ruby><rt></rt></ruby>`タグで囲みます。
7. プレビューを見てふりがなが正しく振られているか確認してください。
8. 問題なければ変換結果エリア右上にあるの青色の「コピー」ボタンを押してコピーできます。

:::note warn

文中に読みが違うけど同じ漢字があるとふりがなが被ってしまいます。<br>
<img width="250" alt="「日」の部分に「きょう」と「ひ」のふりがなが被っている様子" src="https://github.com/user-attachments/assets/e028d7f0-0df0-4aee-8a58-12e26188d68f" /><br>
「今日」の「日」の部分に「ひ」が該当して 2 回ふりがなが振られてしまいます。<br>
コピー後に手動で削除/編集してください。

:::

### AI ありの場合

-   GitHub からクローンしてください。
-   Gemini の API キーが必要です。

1. Node インストール

```command
$ npm i
```

2. `.env`ファイル生成

```.env
VITE_API_KEY=YOUR_GEMINI_API_KEY // YOUR_GEMINI_API_KEYの部分をご自身のAPIキーで書き換えてください。
```

3. ローカル環境起動

```command
$ npm run dev
```

4. 前述した使い方に加え
    - 青色の「テキストを解析して単語とふりがなを抽出」ボタンで多数の単語を AI が抽出
    - 単語のフィールドにフォーカスするとふりがなの候補が出現 → クリックでふりがな入力欄に反映
    - もちろん AI が抽出した単語/ふりがなとも手動で編集可能

**※不明点などあればご連絡ください。**

---

## 要件

以下の要件を考慮した時短ツールになってます。

1. アクセシビリティ対応
2. 英訳対応
3. デザインへの配慮

### 1.アクセシビリティ対応

`<ruby>吾輩<rt>わがはい</rt></ruby>は<ruby>猫<rt>ねこ</rt></ruby>である。`というマークアップを見てみましょう。

読み上げ機能を使ってみます。

<img alt="吾輩わがはいは猫ねこである。を読み上げ機能で読み上げた時の音声を視覚的に分かりやすくした画像" src="https://github.com/user-attachments/assets/1bf25b14-b026-4a04-8521-718882554e08" />

-   「わがはいわがはいは」（吾輩わがはい）
-   「ねこねこである」（猫ねこ）
-   「なまえなまえはまだ」（名前なまえ）
-   「なない」（無ない）

このように`漢字`→`ふりがな`と ２回読み上げられてしまいます。<br>
そのため`aria-hidden="true"`で全体を囲みます。<br>
ただ読み上げから除外するのは意味ないので読み上げ専用のテキストを直後に用意します。

<!-- prettier-ignore-start -->
```html
<p>
    <span aria-hidden="true"><ruby>吾輩<rt>わがはい</rt></ruby>は<ruby>猫<rt>ねこ</rt></ruby>である。</span><!-- 読み上げしないのテキスト -->
    <span translate="yes">吾輩は猫である。</span><!-- 読み上げ専用のテキスト -->
</p>
```
<!-- prettier-ignore-end -->

これだけだと読み上げ専用テキストも表示されてしまうので非表示にします。

:::note info

`translate="yes"`は後述します。

:::

<!-- prettier-ignore-start -->
```scss
/* 日本語は非表示（読み上げのみ）、翻訳は表示 */
[translate='yes'] {
    position: fixed !important;
    inset-block-start: 0 !important;
    inset-inline-start: 0 !important;
    display: block !important;
    inline-size: 1px !important;
    block-size: 1px !important;
    contain: strict !important;
    pointer-events: none !important;
    opacity: 0 !important;
    // display: none; // display: none;では読み上げ対象から外れるので指定しません。
}
```
<!-- prettier-ignore-end -->

### 2.英訳対応

続いては英訳してみましょう。

<img alt="ふりがなを振ったマークアップを英訳して表示したテキストの画像" src="https://github.com/user-attachments/assets/c21c80ba-dd15-4ac9-a21d-1e645e9f4dbd" />

訳がわかりませんね…

英訳時は HTML タグで囲われたテキストごと（単語ごと）に英訳されるため、文脈が考慮されません。

<!-- prettier-ignore-start -->
```html
<ruby>猫
    <rt>
        <font style="vertical-align: inherit;">
            <font style="vertical-align: inherit;">cat</font>
        </font>
    </rt>
</ruby>
```
<!-- prettier-ignore-end -->

検証ツールを見てみると`<font style="vertical-align: inherit;"></font>`というタグで英文が囲われていることがわかります。

そこで以下のようにします。

<!-- prettier-ignore-start -->
```html
<p>
    <span aria-hidden="true" translate="no"><ruby>吾輩<rt>わがはい</rt></ruby>は<ruby>猫<rt>ねこ</rt></ruby>である。</span><!-- 読み上げしないのテキスト -->
    <span translate="yes">吾輩は猫である。</span><!-- 読み上げ専用のテキスト -->
</p>
```
<!-- prettier-ignore-end -->

`translate="no"`を付与することで英訳されなくなります。

> 吾輩わがはいは猫ねこである。<br>
> I am a cat.

これだけでは「ふりがなと漢字が 2 回表示される日本語」と「英文」が同時に表示されてしまいますので以下の記述を追記します。

<!-- prettier-ignore-start -->
```scss
/* 日本語以外は非表示 */
:where(:not(:lang(ja))) [translate='no'] {
    display: none;
}
```
<!-- prettier-ignore-end -->

非表示にするなら`translate="no"`がいらない、と言われたらその通りです…w<br>
おまじない、様式のようなものとして覚えておくに越したことはないです。

### 3.デザインへの配慮

`<ruby><rt></rt></ruby>`はスタイルのクセが強いです。<br>
漢字よりふりがなが長いと文字間が大きく開きます。

<img width="283" alt="漢字よりふりがなが長く文字間が大きく開いている様子" src="https://github.com/user-attachments/assets/d882eda9-1b43-458a-98a9-66fcb4e1465a" />

そこで以下のスタイルを提案します。<br>
また、Safari はふりがながわずかに大きく表示されるので、Safari のみに当たる CSS ハックを使用して個別に当ててます。<br>
※要件に合わせて使い分けてください。

<!-- prettier-ignore-start -->
```scss
/* カーニング調整用 */
[translate='no'] ruby[data-absolute='true'] {
    position: relative;
}
[translate='no'] ruby[data-absolute='true'] rt {
    position: absolute;
    top: -1em;
    left: 0;
    word-break: keep-all;
}

/* Safari */
_::-webkit-full-page-media,
_:future,
:root rt {
    scale: 0.9;
    width: 0;
    height: 1em;
    transform: translateY(-0.05em);
    margin-inline-start: -0.25em;
}
```
<!-- prettier-ignore-end -->

▼ 結果<br>
<img width="242" alt="スクリーンショット 2025-03-11 14 06 26" src="https://github.com/user-attachments/assets/9c3b3dc0-5946-48a0-aeee-cd73462d18d8" />

:::note warn

ただこの方法は注意点があります。

:::

`漢字ふりがな漢字ふりがな`のように交互に続く場合、前の漢字のふりがなが後ろのふりがなに被ることがあります。

<img width="172" alt="前の漢字のふりがなが後ろのふりがなに被っている様子" src="https://github.com/user-attachments/assets/0ceb1e00-64c3-440e-9de5-dc04f9878070" />

使用する際は注意してください。

基本的には`absolute`は使用せず、ブラウザの挙動に乗っ取ったほうが良いです。<br>
「仕様です」「こんなデメリットがあります」などちゃんと説明した上で相談しましょう。

---

## その他

### scss コピペ用

<!-- prettier-ignore-start -->
```scss
/* ===============================================
# MARK: 翻訳、読み上げ対応
=============================================== */
/* 日本語以外は非表示 */
:where(:not(:lang(ja))) [translate='no'] {
    display: none;
}

/* 日本語は非表示（読み上げのみ）、翻訳は表示 */
:where(:lang(ja)) [translate='yes'] {
    position: fixed !important;
    inset-block-start: 0 !important;
    inset-inline-start: 0 !important;
    display: block !important;
    inline-size: 1px !important;
    block-size: 1px !important;
    contain: strict !important;
    pointer-events: none !important;
    opacity: 0 !important;
}

/* カーニング調整用 */
[translate='no'] ruby[data-absolute='true'] {
    position: relative;
}
[translate='no'] ruby[data-absolute='true'] rt {
    position: absolute;
    top: -1em;
    left: 0;
    word-break: keep-all;
}

/* Safari */
_::-webkit-full-page-media,
_:future,
:root rt {
    scale: 0.9;
    width: 0;
    height: 1em;
    transform: translateY(-0.05em);
    margin-inline-start: -0.25em;
}
```
<!-- prettier-ignore-end -->
