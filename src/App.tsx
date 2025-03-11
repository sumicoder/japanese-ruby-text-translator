import React, { useState, useEffect, useRef } from 'react';
import * as _ from 'lodash';
import './App.css';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_API_KEY; // 取得したAPIキーを設定
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const RubyTranslator = () => {
    const [sourceText, setSourceText] = useState('');
    const [coloredText, setColoredText] = useState('');
    const [rubyPairs, setRubyPairs] = useState([{ tango: '', reading: '', isAbsolute: false }]);
    const [resultText, setResultText] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [activePairIndex, setActivePairIndex] = useState(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const textareaRef = useRef(null);
    const suggestionsRef = useRef(null);

    useEffect(() => {
        colorizeText();
    }, [sourceText]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setSuggestions([]);
                setActivePairIndex(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [suggestionsRef]);

    const colorizeText = () => {
        let colored = '';
        for (let char of sourceText) {
            if (/[\u4e00-\u9faf]/.test(char)) {
                colored += `<span style="color: red;">${char}</span>`;
            } else {
                colored += char;
            }
        }
        setColoredText(colored);
    };

    const handleAddPair = () => {
        setRubyPairs([...rubyPairs, { tango: '', reading: '' }]);
    };

    const copyToClipboard = () => {
        if (textareaRef.current) {
            textareaRef.current.select();
            document.execCommand('copy');
            setCopySuccess(true);
            setTimeout(() => {
                setCopySuccess(false);
            }, 3000);
        }
    };

    const handleAbsoluteChange = (index: number, checked: boolean) => {
        updatePair(index, 'isAbsolute', checked);
    };

    const updatePair = (index: number, field: string, value: string | boolean) => {
        const newPairs = [...rubyPairs];
        if (typeof value === 'boolean' && field === 'isAbsolute') {
            newPairs[index][field] = value;
        } else if (typeof value === 'string' && (field === 'tango' || field === 'reading')) {
            newPairs[index][field] = value;
        }
        setRubyPairs(newPairs);

        // 漢字が入力された場合、読み仮名の候補を表示
        if (field === 'tango' && value) {
            setActivePairIndex(index);
            generateSuggestions(value);
        }
    };

    const removePair = (index) => {
        const newPairs = [...rubyPairs];
        newPairs.splice(index, 1);
        setRubyPairs(newPairs);
    };

    const generateSuggestions = async (tango) => {
        if (!tango) {
            setSuggestions([]);
            return;
        }

        try {
            const prompt = `「${tango}」の読み仮名をひらがなで出力してください。単語ごとに読み仮名を出力してください。単語は漢字のみです、ひらがな、カタカナは出力しないで。単語は「」の中だけ対象にして出力してください。`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // 読み仮名の候補を抽出（正規表現でひらがなを抽出）
            const readingSuggestions = text.match(/[\u3040-\u309F]+/g) || [];

            // 重複を削除
            setSuggestions([...new Set(readingSuggestions)]);
        } catch (error) {
            console.error('Error generating suggestions:', error);
            setSuggestions([]);
        }
    };

    const selectSuggestion = (reading) => {
        if (activePairIndex !== null) {
            const newPairs = [...rubyPairs];
            newPairs[activePairIndex].reading = reading;
            setRubyPairs(newPairs);
            setSuggestions([]);
            setActivePairIndex(null);
        }

        // 予測変換のテキストをクリックしたときに、漢字のinput要素にフォーカスを当てる
        const tangoInput = document.querySelector(`input[name="tango-${activePairIndex}"]`);
        if (tangoInput) {
            tangoInput.focus();
        }
    };
    const analyzeFullText = async () => {
        if (!sourceText) return;

        try {
            const prompt = `「${sourceText}」に含まれる単語とその読み仮名を「単語:読み仮名」の形式で改行区切りですべて出力してください。単語は漢字のみです、ひらがな、カタカナは出力しないで。単語は「」の中だけ対象にして出力してください。`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // 漢字と読み仮名のペアを抽出（正規表現で抽出）
            const pairs = text
                .split('\n')
                .map((line) => line.match(/([\u4e00-\u9faf\u3040-\u309F\u30A0-\u30FF]+):([\u3040-\u309F]+)/))
                .filter((match) => match)
                .map((match) => ({ tango: match[1], reading: match[2] }));

            // 重複を除外
            const uniquePairs = _.uniqBy(pairs, 'tango');

            if (uniquePairs.length > 0) {
                setRubyPairs(uniquePairs);
            }
        } catch (error) {
            console.error('Error analyzing text:', error);
        }
    };

    const processText = () => {
        let processedText = sourceText;

        // 空のペアを除外
        const validPairs = rubyPairs.filter((pair) => pair.tango && pair.reading);

        // 文字数が多い順に並べ替え（部分一致の優先順位を調整）
        const sortedPairs = [...validPairs].sort((a, b) => b.tango.length - a.tango.length);

        sortedPairs.forEach((pair) => {
            const regex = new RegExp(_.escapeRegExp(pair.tango), 'g');
            const rubyTag = pair.isAbsolute ? `<ruby data-absolute="true">${pair.tango}<rt>${pair.reading}</rt></ruby>` : `<ruby>${pair.tango}<rt>${pair.reading}</rt></ruby>`;
            processedText = processedText.replace(regex, rubyTag);
        });

        // 最終的なフォーマットを作成
        const finalText = `<span aria-hidden="true" translate="no">${processedText}</span><span translate="yes">${sourceText}</span>`;

        setResultText(finalText);
    };

    return (
        <div className="max-w-7xl mx-auto mb-40 p-4">
            <h1 className="text-2xl font-bold mb-4">漢字ルビ変換ツール</h1>

            <div className="grid grid-cols-1 gap-4">
                {/* 入力フォーム */}
                <div className="space-y-4">
                    <div>
                        <label className="block mb-2 font-medium">テキスト入力:</label>
                        <textarea className="w-full h-40 p-2 border rounded" value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="ルビを振りたいテキストを入力してください" />
                        <button className="mt-2 bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600" onClick={analyzeFullText}>
                            テキストを解析して単語とふりがなを抽出
                        </button>
                    </div>
                    <label className="block mb-0 font-medium">漢字候補:</label>
                    <div className="p-2 border rounded min-h-24" dangerouslySetInnerHTML={{ __html: coloredText }} />
                    {/* 単語とふりがなのペア */}
                    <div className="space-y-2 mb-4">
                        <table className="w-1/2 border-collapse">
                            <thead>
                                <tr>
                                    <td className="pb-2 font-medium" colSpan={3}>
                                        単語とふりがなのペア:
                                    </td>
                                </tr>
                            </thead>
                            <tbody>
                                {rubyPairs.map((pair, index) => (
                                    <tr key={index} className="relative">
                                        <td className="p-2 border">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    className="flex-1 p-2 border border-gray-500 rounded"
                                                    value={pair.tango}
                                                    onChange={(e) => updatePair(index, 'tango', e.target.value)}
                                                    placeholder="単語"
                                                    name={`tango-${index}`}
                                                    onFocus={() => {
                                                        if (pair.tango) {
                                                            setActivePairIndex(index);
                                                            generateSuggestions(pair.tango);
                                                        } else {
                                                            setSuggestions([]);
                                                        }
                                                    }}
                                                />
                                                <input type="text" className="flex-1 p-2 border border-gray-500 rounded" value={pair.reading} onChange={(e) => updatePair(index, 'reading', e.target.value)} placeholder="よみがな" />
                                                <label htmlFor={`position-absolute-${index}`} className="grid">
                                                    position:absolute;
                                                    <input type="checkbox" name={`position-absolute-${index}`} id={`position-absolute-${index}`} className="p-2 border border-gray-500 rounded" checked={pair.isAbsolute} onChange={(e) => handleAbsoluteChange(index, e.target.checked)} />
                                                </label>
                                                <button className="bg-red-500 text-white px-3 rounded hover:bg-red-600" onClick={() => removePair(index)}>
                                                    ×
                                                </button>
                                            </div>
                                            {/* 予測変換の候補表示 */}
                                            {activePairIndex === index && suggestions.length > 0 && (
                                                <div ref={suggestionsRef} className="absolute z-10 bg-white shadow-lg border rounded w-full max-h-32 overflow-y-auto">
                                                    {suggestions.map((suggestion, i) => (
                                                        <div key={i} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => selectSuggestion(suggestion)}>
                                                            {suggestion}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button className="bg-blue-500 text-white px-8 py-2 rounded hover:bg-blue-600" onClick={handleAddPair}>
                        単語を追加する
                    </button>
                    <button className="block bg-green-500 text-white px-8 py-2 rounded hover:bg-green-600" onClick={processText}>
                        ルビ振りテキストに変換する
                    </button>
                </div>
                {/* プレビュー領域 */}
                {resultText && (
                    <div className="mt-4">
                        <h2 className="text-xl font-bold mb-2">プレビュー:</h2>
                        <div className="border p-4 rounded">
                            <div dangerouslySetInnerHTML={{ __html: resultText.split('</span>')[0] }} />
                            <div dangerouslySetInnerHTML={{ __html: resultText.split('</span>')[1] }} />
                        </div>
                    </div>
                )}
                {/* 結果 */}
                <div>
                    <label className="block mb-2 font-medium">変換結果:</label>
                    <div className="relative">
                        {' '}
                        {/* 相対位置指定 */}
                        <textarea
                            ref={textareaRef} // textareaに参照を割り当て
                            className="w-full h-64 py-3 ps-3 pe-24 border rounded resize-none"
                            value={resultText}
                            readOnly
                        />
                        <button className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600" onClick={copyToClipboard}>
                            コピー
                        </button>
                        {copySuccess && <div className="absolute top-12 right-2 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded">コピーしました！</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RubyTranslator;
