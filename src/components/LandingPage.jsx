import React from "react";
import EffectsIconPlot from "./EffectsIconPlot";
import * as Dialog from "@radix-ui/react-dialog";
import { ScrollArea } from "./ui/scroll-area";

export default function LandingPage() {
  const sharedStyle = { ["--hero-bg"]: "rgba(0,0,0,0.06)" };

  return (
    <div className="bg-white text-black min-h-screen">


      {/* ===== HERO ===== */}
      <header className="bg-[var(--hero-bg)] text-black" style={sharedStyle}>
        <div className="mx-auto max-w-[92vw] px-2 py-[5px]">
          {/* タイトル＋説明文＋read more（横並びで末尾にボタン） */}
          <div className="grid grid-cols-[auto,1fr] items-start">
            {/* 左：タイトル */}
            <h1 className="m-0 font-sans font-semibold tracking-tight leading-tight text-[15px] whitespace-nowrap mr-[20ch]">
              TEAMFIGHT TACTICS    AI分析
            </h1>

            {/* 右：説明文＋read more */}
            <div className="col-start-2">
              <div className="flex items-end justify-between w-full text-left">
                {/* 説明文 */}
                <div className="flex-1">
                  <p className="m-0 text-[15px] leading-6">
                    試合ログをAI（機械学習）で解析し、キャリーに積んだ各アイテムの影響を
                    「順位がどれだけ上下するか」を指標に推定しています。
                  </p>
                  <p className="m-0 text-[15px] leading-6 mt-1">
                    We analyze match logs with machine learning and estimate the effect of each item
                    equipped on the carry, using the change in final placement as the metric.
                  </p>
                </div>

                {/* 説明文の末尾に配置したボタン */}
                <div className="ml-4 shrink-0">
                  <Dialog.Root>
                    <Dialog.Trigger asChild>
                      <button
                        type="button"
                        className="rounded-lg border border-neutral-800 bg-white text-black px-3 py-1 text-[15px] font-medium hover:bg-neutral-200"
                      >
                        read more
                      </button>
                    </Dialog.Trigger>

                    <Dialog.Portal>
                      <Dialog.Overlay className="fixed inset-0 bg-black/60" />

                      <Dialog.Content
                        className="
                          fixed left-1/2 -translate-x-1/2
                          inset-y-[5vh] w-[92vw] max-w-[720px]
                          rounded-2xl bg-white p-6 shadow-xl
                          focus:outline-none flex flex-col
                        "
                      >
                        <Dialog.Title className="text-lg font-semibold">
                          AI(機械学習）方法
                        </Dialog.Title>

                        <ScrollArea className="mt-4 flex-1 pr-3 overflow-y-auto">
                          <div className="space-y-4 text-[15px] leading-7 text-neutral-800 whitespace-pre-line">
                            <p>
                              本ツールは、試合ログからキャリーに積んだ各アイテムが、最終順位をどれだけ上下させるかを推定するために、2段階の機械学習で効果を分離・可視化します。
                            </p>
                            <p>
                              <strong>Stage 1：盤面の強さを先に説明して残差を作る</strong>
                              <br />
                              まず、ユニット構成や特性など、アイテム以外の要因で説明できる盤面の強さを学習器でモデル化し、最終順位を予測します。ここではクロスバリデーションの枠組みで外部予測（OOF）を作り、過学習やデータ漏れを抑えたうえで「実際の順位 − 予測順位」という残差を算出。以降の分析では、この残差をアイテムがもたらした追加的な上げ下げの手がかりとして扱います。
                            </p>
                            <p>
                              <strong>Stage 2：キャリーごとにアイテムの効き目だけを切り出す</strong>
                              <br />
                              次に、キャリーごとにデータを切り分け、そのキャリーが装備したアイテムをOne-hot（装備した/していない）に展開します。ここで採用する候補アイテムは、十分な出現数を満たす上位群に絞り、ノイズや偶然を減らします。
                              <br />
                              各キャリーの設計行列に対しては、スパース回帰（ElasticNet）を用いて残差を説明します。これにより、相関しがちなアイテム同士の影響を抑えつつ、どのアイテムが効いているのかを選び分けることができます。さらに、試合ID単位でのブートストラップを重ね、推定値の不確実性（信頼区間）も同時に出し、効果の向きや強さに確度を添えるのがポイントです。
                            </p>
                            <p>
                              <strong>信頼できる見やすさのための設計</strong>
                              <br />
                              対象期間や対象キューは設定ファイルで管理し、データの鮮度や条件を明示したうえで再現可能にしています。
                              <br />
                              フロントエンドでは、これらの推定結果（係数・信頼区間・サポート数）を0基準の共通スケールに載せてアイコン中心に可視化。チャンピオン間の効き目の差がひと目で比較できるようになっています。
                            </p>
                            <p>
                              <strong>どう読めばいいか</strong>
                              <br />
                              係数（coef）は「そのアイテムを積んだ時、順位がどちらにどれだけ動くか」の推定量です。0から左右に離れるほど、影響が大きいと解釈できます。
                              <br />
                              信頼区間（CI）は、その推定にどれだけ確度があるかを示します。区間が短いほど、判断が安定しているサインです。
                              <br />
                              サポート数（n）は、その推定がどれだけの事例に基づいているかを表し、レアな組み合わせに振り回されにくいように最低閾値も設けています。
                            </p>
                            <p>
                              この流れにより、アイテム以外の強さを先に説明で剥がし、そのうえでキャリーごとのアイテム効果をクリーンに切り出し、不確実性ごと提示する――という、実戦に使える機械学習の形に仕上げています。
                            </p>
                          </div>
                        </ScrollArea>

                        <div className="mt-6 flex justify-end">
                          <Dialog.Close asChild>
                            <button
                              type="button"
                              className="rounded-full border border-neutral-800 bg-white text-black px-4 py-2 text-sm font-medium hover:bg-neutral-200"
                            >
                              閉じる
                            </button>
                          </Dialog.Close>
                        </div>
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog.Root>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== MAIN（リング枠） ===== */}
      <main className="mx-auto max-w-[92vw] px-2 pb-16 md:pb-20">
        <div className="mt-10 md:mt-12">
          <div
            className="relative rounded-2xl bg-[var(--hero-bg)] p-4 md:p-6 shadow-sm border-transparent overflow-hidden isolate"
            style={sharedStyle}
          >
            <div className="rounded-xl bg-white p-0">
              <EffectsIconPlot />
            </div>
          </div>
        </div>
      </main>

      {/* ===== お問い合わせ ===== */}
      <section className="mx-auto max-w-[92vw] px-2">
        <div className="py-6">
          <div className="md:w-1/3 ml-auto">
            <div
              className="rounded-2xl bg-[var(--hero-bg)] text-black p-6 md:p-7 shadow-sm border"
              style={sharedStyle}
            >
              <h2 className="m-0 text-lg md:text-xl font-semibold">Contact Us</h2>
              <p className="text-sm text-neutral-700 mt-1">You can send us a message below</p>
              <form
                action="https://formspree.io/f/myzdooqg"
                method="POST"
                className="mt-5 space-y-3"
              >
                {/* honeypot（bot対策） */}
                <input type="text" name="_gotcha" className="hidden" tabIndex="-1" autoComplete="off" />

                <label className="block text-sm font-medium text-neutral-700">
                  Name
                  <input
                    name="name"
                    type="text"
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                  />
                </label>

                <label className="block text-sm font-medium text-neutral-700">
                  Email
                  <input
                    name="email"
                    required
                    type="email"
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                  />
                </label>

                <label className="block text-sm font-medium text-neutral-700">
                  Message
                  <textarea
                    name="message"
                    required
                    rows={4}
                    className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                  />
                </label>

                <button
                  type="submit"
                  className="rounded-full border border-neutral-800 bg-white text-black px-6 py-2 text-sm font-medium hover:bg-neutral-200"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="mx-auto max-w-[92vw] mt-12 border-t border-neutral-200 py-6 text-center text-xs text-neutral-600">
        <p>
          © 2025 tftmortorlearnig.tftmortorlearing isn't endorsed by Riot Games and doesn't reflect
          the views or opinions of Riot Games or anyone officially involved in producing or
          managing Riot Games properties. Riot Games, and all associated properties are
          trademarks or registered trademarks of Riot Games, Inc.
        </p>

        <div className="mt-3 flex justify-center gap-6">
          {/* Privacy Policy */}
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button className="underline hover:text-black">Privacy Policy</button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/60" />
              <Dialog.Content
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                           w-[92vw] max-w-[720px] rounded-2xl bg-white p-6 shadow-xl
                           focus:outline-none"
              >
                <Dialog.Title className="text-lg font-semibold mb-4">Privacy Policy</Dialog.Title>
                <ScrollArea className="max-h-[70vh] pr-3">
                  <div className="space-y-3 text-left text-[15px] leading-6 text-neutral-800">
                    <p>We collect only the minimum necessary information (such as email address when using the contact form) in order to respond to inquiries.</p>
                    <p>Your personal data will not be shared with third parties except when required by law.</p>
                    <p>Data is stored securely and retained only as long as necessary to provide our services.</p>
                    <p>By using this site, you consent to this privacy policy. Updates will be posted here.</p>
                  </div>
                </ScrollArea>
                <div className="mt-6 flex justify-end">
                  <Dialog.Close asChild>
                    <button className="rounded-full border border-neutral-800 bg-white text-black px-4 py-2 text-sm font-medium hover:bg-neutral-200">
                      Close
                    </button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          {/* Terms of Service */}
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button className="underline hover:text-black">Terms of Service</button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/60" />
              <Dialog.Content
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                           w-[92vw] max-w-[720px] rounded-2xl bg-white p-6 shadow-xl
                           focus:outline-none"
              >
                <Dialog.Title className="text-lg font-semibold mb-4">Terms of Service</Dialog.Title>
                <ScrollArea className="max-h-[70vh] pr-3">
                  <div className="space-y-3 text-left text-[15px] leading-6 text-neutral-800">
                    <p>By using tftmortorlearning, you agree to use the site only for lawful purposes.</p>
                    <p>We provide this service “as is” without any warranties. We are not liable for any losses or damages arising from the use of this site.</p>
                    <p>All intellectual property rights related to Riot Games are owned by Riot Games, Inc. This site is a fan-made tool and not affiliated with Riot Games.</p>
                    <p>We may update these terms at any time. Continued use of the site constitutes acceptance of the new terms.</p>
                  </div>
                </ScrollArea>
                <div className="mt-6 flex justify-end">
                  <Dialog.Close asChild>
                    <button className="rounded-full border border-neutral-800 bg-white text-black px-4 py-2 text-sm font-medium hover:bg-neutral-200">
                      Close
                    </button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </footer>
    </div>
  );
}
