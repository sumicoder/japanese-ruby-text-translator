import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import _ from 'lodash';

// ルビペアの型定義
interface RubyPair {
    tango: string;
    reading: string;
    isAbsolute: boolean;
}

// 言語オプションの型定義
type LanguageOption = {
    code: string;
    name: string;
};

const RubyTranslator: React.FC = () => {
    const [sourceText, setSourceText] = useState<string>('');
    const [coloredText, setColoredText] = useState<string>('');
    const [rubyPairs, setRubyPairs] = useState<RubyPair[]>([{ tango: '', reading: '', isAbsolute: false }]);
    const [resultText, setResultText] = useState<string>('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [activePairIndex, setActivePairIndex] = useState<number | null>(null);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const [targetLanguage, setTargetLanguage] = useState<string>('ja');
    const [apiKey, setApiKey] = useState<string>('');
    const [model, setModel] = useState<any>(null);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [useApiKey, setUseApiKey] = useState<boolean>(false);
    const [showApiKey, setShowApiKey] = useState<boolean>(false);

    // 言語オプションのリスト
    const languageOptions: LanguageOption[] = [
        { code: 'ja', name: '日本語' },
        { code: 'en', name: '英語' },
        { code: 'zh-CN', name: '中国語' },
    ];

    useEffect(() => {
        colorizeText();
    }, [sourceText]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
                setSuggestions([]);
                setActivePairIndex(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [suggestionsRef]);

    useEffect(() => {
        if (apiKey && useApiKey) {
            try {
                const newGenAI = new GoogleGenerativeAI(apiKey);
                const newModel = newGenAI.getGenerativeModel({
                    model: 'gemini-2.0-flash',
                    safetySettings: [
                        {
                            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                            threshold: HarmBlockThreshold.BLOCK_NONE,
                        },
                    ],
                });
                setModel(newModel);
                setApiKeyError(null);
            } catch (error) {
                console.error('Error initializing GoogleGenerativeAI:', error);
                setApiKeyError('APIキーが正しくありません。');
                setModel(null);
            }
        } else {
            setModel(null);
        }
    }, [apiKey, useApiKey]);

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
        setRubyPairs([...rubyPairs, { tango: '', reading: '', isAbsolute: false }]);
    };

    const handleLanguageChange = (value: LanguageOption) => {
        document.documentElement.lang = value.code;
        setTargetLanguage(value.code);
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

    const updatePair = (index: number, field: keyof RubyPair, value: string | boolean) => {
        const newPairs = [...rubyPairs];
        if (field === 'isAbsolute' && typeof value === 'boolean') {
            newPairs[index][field] = value;
        } else if ((field === 'tango' || field === 'reading') && typeof value === 'string') {
            newPairs[index][field] = value;
        }
        setRubyPairs(newPairs);

        // 漢字が入力された場合、読み仮名の候補を表示
        if (field === 'tango' && typeof value === 'string' && value) {
            setActivePairIndex(index);
            generateSuggestions(value);
        }
    };

    const removePair = (index: number) => {
        const newPairs = [...rubyPairs];
        newPairs.splice(index, 1);
        setRubyPairs(newPairs);
    };

    const generateSuggestions = async (tango: string) => {
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

    const selectSuggestion = (reading: string) => {
        if (activePairIndex !== null) {
            const newPairs = [...rubyPairs];
            newPairs[activePairIndex].reading = reading;
            setRubyPairs(newPairs);
            setSuggestions([]);
            setActivePairIndex(null);
        }

        // 予測変換のテキストをクリックしたときに、漢字のinput要素にフォーカスを当てる
        const tangoInput = document.querySelector(`input[name="tango-${activePairIndex}"]`) as HTMLInputElement;
        if (tangoInput) {
            tangoInput.focus();
        }
    };
    const analyzeFullText = async () => {
        if (!sourceText) {
            alert('文章を入力してください');
            return;
        }

        try {
            const prompt = `「${sourceText}」に含まれる単語とその読み仮名を「単語:読み仮名」の形式で改行区切りですべて出力してください。単語は漢字のみです、ひらがな、カタカナは出力しないで。単語は「」の中だけ対象にして出力してください。`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // 漢字と読み仮名のペアを抽出（正規表現で抽出）
            const pairs = text
                .split('\n')
                .map((line) => line.match(/([\u4e00-\u9faf\u3040-\u309F\u30A0-\u30FF]+):([\u3040-\u309F]+)/))
                .filter((match) => match !== null)
                .map((match) => ({ tango: match[1], reading: match[2], isAbsolute: false }));

            // 重複を除外
            const uniquePairs: RubyPair[] = _.uniqBy(pairs, 'tango');

            if (uniquePairs.length > 0) {
                setRubyPairs(uniquePairs);
            }
        } catch (error) {
            console.error('Error analyzing text:', error);
            alert('分析に失敗しました。\nAPIキーが設定されていないか、\nテキストが正しく抽出できませんでした。\n\n手動でふりがなを入力してください');
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
            <div className="flex justify-around mb-4">
                <h1 className="text-2xl font-bold">漢字ルビ変換ツール</h1>
                <a className="text-blue-500 underline underline-offset-2 text-xl hover:text-blue-200" href="https://github.com/sumicoder/japanese-ruby-text-translator" target="_blank" rel="noopener noreferrer">
                    ドキュメント
                </a>
            </div>
            <div className="mb-4">
                <p className="block mb-2 font-medium">Gemini APIキーを使用する:</p>
                <label className="inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="form-checkbox sr-only peer" checked={useApiKey} onChange={(e) => setUseApiKey(e.target.checked)} />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">使用する</span>
                </label>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {useApiKey && (
                    <div className="mb-4 relative">
                        <a href="https://aistudio.google.com/apikey?hl=ja" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                            Google Gemini APIキーを取得する
                        </a>
                        <label className="block mb-2 font-medium">APIキー:</label>
                        <div className="relative">
                            <input type={showApiKey ? 'text' : 'password'} className="w-full p-2 border rounded" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Google Gemini APIキーを入力してください" />
                            <button type="button" className={`absolute -top-5 left-18 -translate-y-1/2 focus:outline-none cursor-pointer ${showApiKey ? '' : 'before:content before:block before:w-6 before:h-0.5 before:bg-current before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:rotate-45'}`} onClick={() => setShowApiKey(!showApiKey)}>
                                {showApiKey ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {apiKeyError && <p className="text-red-500">{apiKeyError}</p>}
                    </div>
                )}
                {/* 入力フォーム */}
                <div className="space-y-4">
                    <div>
                        <label className="block mb-2 font-medium">テキスト入力:</label>
                        <textarea className="w-full h-40 p-2 border rounded" value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="ルビを振りたいテキストを入力してください" />
                        {useApiKey && (
                            <button className="mt-2 bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600" onClick={analyzeFullText}>
                                テキストを解析して単語とふりがなを抽出
                            </button>
                        )}
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
                        プレビュー と ルビ振りテキストに変換する
                    </button>
                </div>
                {/* プレビュー領域 */}
                {resultText && (
                    <div className="mt-4">
                        {/* <div className="flex"> */}
                        <h2 className="text-xl font-bold mb-2">プレビュー:</h2>
                        {/* <div className="flex">
                                {languageOptions.map((option) => (
                                    <button key={option.code} className={`px-4 py-2 rounded ${option.code === targetLanguage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`} onClick={() => handleLanguageChange(option)}>
                                        {option.name}
                                    </button>
                                ))}
                            </div>
                        </div> */}
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
