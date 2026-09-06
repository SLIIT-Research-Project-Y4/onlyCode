# C1 — Webcam Eye-Tracking / Gaze Estimation: Research Feasibility Assessment

**Status:** Research feasibility review. Not a design document, not an approved scope change.
**Scope of the question:** Should C1 (Telemetry Infrastructure) add webcam-based gaze estimation as an additional behavioural capture stream, using only the candidate's ordinary laptop webcam, to detect a candidate looking away from the coding window (second monitor, phone showing an LLM)?
**Bottom line:** **Recommend against.** See §9. The specific "every window contains data" argument that motivated the proposal does not survive contact with the literature (§9.3), and a cheaper in-scope signal already covers most of the intent (§9.4).

**Evidence discipline used in this document.** Every number is attributed. Where a figure comes from a vendor rather than a peer-reviewed evaluation it is marked **[vendor claim]**. Where a claim is plausible but I could not verify it against the primary source, it is marked **[unverified]**. Where the literature is thin or absent, that is stated rather than papered over.

---

## 0. Reading guide — the geometry that governs everything below

Angular error in degrees of visual angle is the standard metric, and it is screen-size-independent. To make the rest of this document concrete, here is the conversion for a typical candidate setup. **These are my own calculations from standard trigonometry, not literature values**; they are shown so an examiner can check them.

Assume a 14″ 16:9 laptop screen (31.0 cm × 17.4 cm) viewed at 60 cm.

| Quantity | Value | Derivation |
|---|---|---|
| 1° of visual angle at 60 cm | **1.05 cm** on screen | 60 · tan(1°) |
| Full screen width | **≈ 29°** | 2 · atan(15.5/60) |
| Full screen height | **≈ 16.5°** | 2 · atan(8.7/60) |
| One line of code (Monaco, 14 px font, ~19 px line height, 1536 logical px across 31 cm) | **≈ 0.38 cm ≈ 0.37°** | 19 · (31.0/1536) cm, then atan(·/60) |
| One monospace character column (~8.4 px) | **≈ 0.17 cm ≈ 0.16°** | as above |

**Consequences to hold in mind:**

- A gaze error of **1°** — better than anything demonstrated on a laptop webcam in an uncontrolled setting — is already **≈ 2.7 lines of code** vertically and **≈ 6 characters** horizontally.
- A gaze error of **4.17°** (WebGazer's own reported figure, §1.1) is **≈ 11 lines of code**, or **14% of screen width / 25% of screen height**.
- An error of **7 cm** (measured on a typing dataset, §1.6) is **≈ 18 lines** — about **40% of a full-screen editor viewport**, i.e. essentially "somewhere on the screen".
- Conversely, a **second monitor** placed beside the laptop sits roughly **30–40° off-axis** in yaw, and a **phone in the lap** roughly **45–60°** down in pitch. Both are an order of magnitude larger than the errors above, and both are large relative to head-pose error (§2.3).

That asymmetry is the single most important fact in this document: **the coarse task is easy and the fine task is not.** Everything in §1–§7 is elaboration on it.

---

## 1. State of the art in webcam gaze estimation

### 1.1 WebGazer.js — the browser-native baseline

**Papoutsaki, A., Sangkloy, P., Laskey, J., Daskalova, N., Huang, J., & Hays, J. (2016). "WebGazer: Scalable Webcam Eye Tracking Using User Interactions." *IJCAI 2016*, pp. 3839–3845.** https://www.ijcai.org/Proceedings/16/Papers/540.pdf

This is the reference implementation for in-browser gaze estimation and the one most likely to be reached for. Measured results, taken from the paper itself:

| Study | n | Result |
|---|---|---|
| Remote online study | 82 recruited, **76 analysed** (6 excluded for technical issues) | Best library + best regression model: **mean error 104 px**. Averaged across libraries/tasks, ridge regression + cursor sampling (RR+C): **169 px** (SD 147); plain ridge regression: **233 px**; linear regression: **257 px** |
| In-person lab study vs. Tobii EyeX (50 Hz) | **4 participants** | RR+C **169 px**, RR+F+C **187 px**; **average visual angle 4.17° (= 1.6 inches)**. Best detector (clmtrackr) + best model: **≈ 130 px** |

Conditions for the 4.17° figure matter and are usually omitted when it is quoted: a **24″ Samsung SyncMaster at 1920×1200**, an **external Logitech C920 Full HD USB webcam**, at **59 cm**, in a lab, with **n = 4**. It is *not* a laptop-webcam-in-the-wild number.

WebGazer's design point is **self-calibration from user interactions** — it assumes gaze and cursor coincide at the moment of a click, plus cursor-movement samples within a 500 ms buffer and 72 px radius. The paper is explicit that this only works where "the approximate location of the gaze is sufficient", and it explicitly endorses **local (client-side) processing** so that "the video stream does not have to be sent over the web".

Independent replications are consistently *worse* than the headline. Semmelmann & Weigelt's methods work reports that calibration and validation consumed roughly half the study time and that WebGazer's temporal resolution is low and inconsistent; multiple visual-world-paradigm replications report a **≈ 300 ms lag** in the gaze time course versus infrared baselines **[reported via secondary sources; see §1.7 for the aggregated review that quantifies this]**.

### 1.2 MPIIGaze / MPIIFaceGaze — the standard research benchmark

**Zhang, X., Sugano, Y., Fritz, M., & Bulling, A. (2015). "Appearance-Based Gaze Estimation in the Wild." *CVPR 2015*.** https://openaccess.thecvf.com/content_cvpr_2015/papers/Zhang_Appearance-Based_Gaze_Estimation_2015_CVPR_paper.pdf
**Zhang, X., Sugano, Y., Fritz, M., & Bulling, A. (2017/2019). "MPIIGaze: Real-World Dataset and Deep Appearance-Based Gaze Estimation." *IEEE TPAMI* 41(1). arXiv:1711.09017.** https://arxiv.org/abs/1711.09017

- Dataset: **213,659 images from 15 participants**, collected during **everyday laptop use over several months** — the closest public dataset to this project's actual deployment condition.
- **Leave-one-person-out (same dataset): 6.3° mean error** for the CNN in the 2015 paper.
- **Cross-dataset (train on one dataset, test on another): GazeNet 10.8°**, improving on a 13.9° prior state of the art — a 22% relative gain that still leaves the absolute error at **≈ 11 cm on screen at 60 cm**.

The cross-dataset number is the one that matters for deployment: a model trained on someone else's data, applied to your candidates, is exactly the cross-dataset condition.

**Zhang, X., Sugano, Y., Fritz, M., & Bulling, A. (2017). "It's Written All Over Your Face: Full-Face Appearance-Based Gaze Estimation." *CVPRW 2017*. arXiv:1611.08860.** https://arxiv.org/abs/1611.08860 — introduces MPIIFaceGaze and full-face input, reporting relative improvements of **up to 14.3% on MPIIGaze and 27.7% on EYEDIAP**, most pronounced at extreme head poses.

### 1.3 GazeCapture / iTracker — the large-scale mobile benchmark

**Krafka, K., Khosla, A., Kellnhofer, P., Kannan, H., Bhandarkar, S., Matusik, W., & Torralba, A. (2016). "Eye Tracking for Everyone." *CVPR 2016*.** https://www.cv-foundation.org/openaccess/content_cvpr_2016/papers/Krafka_Eye_Tracking_for_CVPR_2016_paper.pdf

- **1,450+ people, ~2.5M frames** — the first large-scale crowdsourced gaze dataset.
- **Without calibration: 1.71 cm (phone), 2.53 cm (tablet). With calibration: 1.34 cm (phone), 2.12 cm (tablet).**
- Runs at **10–15 fps on a contemporary mobile device**.

**Important caveat for this project:** these are *centimetre* errors on a phone or tablet held ~25–30 cm away. Converted to angle at 30 cm, 1.34 cm ≈ 2.6°. They are not directly transferable to a laptop at 60 cm with a worse camera and a much larger screen. Note that 2.12 cm on a tablet is a much smaller *fraction of screen* than 2.12 cm would be on a 14″ laptop screen only if the tablet is smaller — it is not: this metric flatters small screens and short viewing distances.

### 1.4 TabletGaze and EyeTab — earlier unconstrained work

**Huang, Q., Veeraraghavan, A., & Sabharwal, A. (2017). "TabletGaze: dataset and analysis for unconstrained appearance-based gaze estimation in mobile tablets." *Machine Vision and Applications* 28(5–6). arXiv:1508.01244.** https://arxiv.org/abs/1508.01244
— **51 subjects**, 4 body postures, 35 gaze locations; HoG features + Random Forest; **mean error 3.17 cm**. Notably includes subjects with and without prescription glasses and varying race/gender — one of the few early datasets to say so.

**Wood, E., & Bulling, A. (2014). "EyeTab: Model-based gaze estimation on unmodified tablet computers." *ETRA 2014*.** https://dl.acm.org/doi/10.1145/2578153.2578185
— Model-based (iris-as-ellipse back-projected to a 3D circle), no learning. **8 participants**, normal indoor office: **6.88° average accuracy at 12 fps**. Included here because it shows how much of the recent gain is data-driven rather than optical.

### 1.5 Recent (2020+) work — where the field actually is

**Zhang, X., Park, S., Beeler, T., Bradley, D., Tang, S., & Hilliges, O. (2020). "ETH-XGaze: A Large Scale Dataset for Gaze Estimation under Extreme Head Pose and Gaze Variation." *ECCV 2020*.** https://ait.ethz.ch/xgaze
— **>1M high-resolution images, 110 participants, 18 DSLR cameras**, controlled illumination. This is a *hardware-rig* dataset. It improves robustness across head pose; it does not tell you what a laptop webcam achieves.

**Abdelrahman, A. A., Hempel, T., Khalifa, A., & Al-Hamadi, A. (2022). "L2CS-Net: Fine-Grained Gaze Estimation in Unconstrained Environments." arXiv:2203.03339.** https://arxiv.org/abs/2203.03339
— Separate yaw/pitch regression heads. **3.92° on MPIIFaceGaze**; **10.41° on Gaze360**. The Gaze360 number is the honest one for "unconstrained": in the wild, the field is at **≈ 10°**, i.e. **≈ 10.5 cm on screen at 60 cm**, i.e. a third of screen width.

**Valliappan, N., Dai, N., Steinberg, E., He, J., Rogers, K., Ramachandran, V., Xu, P., Shojaeizadeh, M., Guo, L., Kohlhoff, K., & Navalpakkam, V. (2020). "Accelerating eye movement research via accurate and affordable smartphone eye tracking." *Nature Communications* 11:4553.** https://www.nature.com/articles/s41467-020-18360-5
— The best headline number in the field: **0.6°–1.0° accuracy**, "comparable to state-of-the-art mobile eye trackers 100× more expensive". **Read the conditions:** a *smartphone* front camera at short viewing distance, with per-participant personalisation, on Google's own hardware/software stack. It is genuinely impressive and it is **not** a laptop-webcam-during-a-coding-interview result. Quoting 0.6° in support of this proposal would be misleading.

**Davalos, E., Zhang, Y., Srivastava, N., Thatigotla, Y., Salas, J. A., McFadden, S., Cho, S.-J., Goodwin, A., Ashwin, T. S., & Biswas, G. (2025). "WebEyeTrack: Scalable Eye-Tracking for the Browser via On-Device Few-Shot Personalization." arXiv:2508.19544.** https://arxiv.org/abs/2508.19544
— The most directly relevant recent system: MediaPipe face landmarks + model-based head pose + a **670 KB, 0.16 M-parameter** CNN ("BlazeGaze"), trained in TensorFlow and shipped to the browser via `tensorflowjs_converter`, with **on-device calibration and inference so "user data never leaves the device"**. Reported results:

| Dataset | Point-of-gaze error |
|---|---|
| GazeCapture | **2.32 cm** |
| MPIIFaceGaze | **4.56 cm** |
| EyeDiap | **7.53 cm** |
| **Eye of the Typer (cross-dataset, laptop webcams, real typing)** | **7.24 cm at session start → 8.72 cm at session end (+20% over 20 min)** |

Calibration: **k ≤ 9 samples**. Inference: **0.88 ms / ~1,137 fps on an Intel i7-11700F**, **2.4 ms on an iPhone 14** — model inference only, excluding the MediaPipe landmark stage and frame capture. Stated future work includes **"improving model fairness and reducing energy consumption"**, i.e. fairness is acknowledged as unaddressed.

### 1.6 The single most relevant measurement in the entire literature

The **Eye of the Typer** row above deserves its own heading, because it is webcam gaze **measured on people who are typing**, which is what this project's users do.

**Papoutsaki, A., Gokaslan, A., Tompkin, J., He, Y., & Huang, J. (2018). "The eye of the typer: a benchmark and analysis of gaze behavior during typing." *ETRA 2018*.** https://dl.acm.org/doi/10.1145/3204493.3204552 · dataset: https://webgazer.cs.brown.edu/data/
— **64 participants recruited, 51 with valid data**; webcam video at **640×480**, plus keyboard logs, screen recordings, and **Tobii Pro X3-120** ground truth.

On this dataset, over a 20-minute session (as re-measured by Davalos et al. 2025 above):

- **WebGazer: 7.79 cm → 11.62 cm (+49%)**
- **WebEyeTrack: 7.24 cm → 8.72 cm (+20%)**

**7–12 cm of error on a 31 cm-wide screen.** Restated in this project's terms (§0): **19–30 lines of code**. Under the exact task — a person typing at a laptop — the best available browser gaze estimator cannot reliably tell you which *half* of the editor is being looked at, and gets meaningfully worse across a session length shorter than a real interview.

### 1.7 Aggregated reviews — the honest consensus range

**Lau, K. H. C., & Kasneci, E. (2026). "What Shapes Participant Data Quality? A Scoping Review and Case Study of Crowdsourced Webcam Eye Tracking in AI Interviews." *Proc. ACM Hum.-Comput. Interact.* 10(3), Article ETRA003. arXiv:2605.02898.** https://arxiv.org/abs/2605.02898

Its synthesis of the field states three consensus limitations: **spatial inaccuracy of ~3°–4.5°**, **sampling rates of 12–30 Hz** versus 100–1000 Hz for infrared systems, and **temporal delays of 200–700 ms** with effect sizes **40–60% of laboratory results**. Reviews also note **centering bias** (gaze estimates cluster toward screen centre) and **vertical compression** (systematic underestimation on the y-axis) — both of which specifically damage the "which line of code" task, which is a *vertical* discrimination.

A parallel scoping review reaches the same range: **Patterson et al. / "Methodological recommendations for webcam-based eye tracking: A scoping review" (2025), *Computers in Human Behavior Reports*.** https://www.sciencedirect.com/science/article/pii/S2772766125000655 (abstract accessible; full text was 403 to automated fetch, so figures here are taken from the Lau & Kasneci synthesis that cites it).

### 1.8 The best-case counterexample, stated fairly

**Kaduk, T., Goeke, C., Finger, H., & König, P. (2023). "Webcam eye tracking close to laboratory standards: Comparing a new webcam-based system and the EyeLink 1000." *Behavior Research Methods*, DOI 10.3758/s13428-023-02237-8.** https://pmc.ncbi.nlm.nih.gov/articles/PMC11289017/

This is the strongest published webcam result and the proposal deserves to see it:

- **Webcam: 1.45° accuracy (SD 0.76°), 1.23° precision. EyeLink 1000: 0.91° accuracy, 1.02° precision.** Raw-sample correlation with EyeLink r ≈ 0.83–0.86 (x) and 0.78–0.84 (y).
- Data loss under head **roll** was actually *lower* for the webcam (2.05%) than the EyeLink (12.09%).

**But read the setup, which is the whole point:** a **Logitech StreamCam 1080p on top of a monitor**, a **15″ 1440×900 display at exactly 600 mm**, a **"virtual chinrest" with medium-strict sensitivity** that constrains the participant's position, **23 recruited / 19 analysed / 17 in session 2 (4 excluded)**, and a **5-minute calibration with seven head poses and ~12 targets each**, requiring <7% screen-size error to pass.

Five minutes of enforced calibration, a fixed distance, a pose-constraining virtual chinrest, and an external HD camera. None of that is available in a live technical interview, and imposing it would itself change the behaviour being measured.

---

## 2. Can it detect the signal actually wanted?

The proposal conflates two tasks with wildly different difficulty. They must be assessed separately.

### 2.1 Task (a): fine-grained on-screen gaze — *which line of code is being read*

**Verdict: not achievable on a laptop webcam.** Not marginally — by an order of magnitude.

From §0, one line of code subtends **≈ 0.37°**. The evidence:

| Source | Error | In lines of code |
|---|---|---|
| Kaduk et al. 2023, best case, external cam + virtual chinrest + 5-min calibration | 1.45° | ≈ 4 lines |
| Field consensus (Lau & Kasneci 2026 synthesis) | 3–4.5° | ≈ 8–12 lines |
| WebGazer, lab, external cam, n=4 (Papoutsaki 2016) | 4.17° | ≈ 11 lines |
| L2CS-Net on Gaze360 (unconstrained) | 10.41° | ≈ 28 lines |
| WebEyeTrack / WebGazer on Eye of the Typer (laptop webcams, typing) | 7.2–11.6 cm | ≈ 19–30 lines |

Even the single most favourable published result — obtained under conditions this project cannot reproduce — resolves to roughly a four-line band. The realistic figure resolves to "somewhere in this function, probably". There is no version of this that supports a claim like "the candidate read the pasted block rather than typing it from understanding".

This also interacts badly with the documented **vertical compression** and **centering bias** (§1.7): the errors are not zero-mean noise you can average away, they are *systematic* and they are worst on the axis that distinguishes lines.

### 2.2 Task (b): coarse on-screen vs. off-screen

**Verdict: plausibly achievable — but the evidence base is thinner than the marketing suggests, and it is mostly achievable via head pose, not gaze.**

- **Falch, L., & Lohan, K. S. (2024). "Webcam-based gaze estimation for computer screen interaction." *Frontiers in Robotics and AI* 11:1369566.** https://doi.org/10.3389/frobt.2024.1369566 — projects CNN gaze vectors onto the screen using a 4-point calibration. Reported RMSE **53 mm / 3.3° (OpenVINO backend)**, **50 mm / 3.2° (ETH-XGaze backend)** at 800 mm, versus **15 mm / 0.9°** for a Tobii Eye Tracker 5. Under head yaw/pitch of ±30°/±25° this degrades to **80 mm / 5.1°**; under ±100 mm lateral movement, **60 mm / 4°**. Stated plainly by the authors: 2D webcam solutions "fail to effectively accommodate precise head movements" and "still cannot attain the level of accuracy achieved by sophisticated gaze tracking hardware". **Critically: this is a single-user demonstration**, not a study — treat the numbers as existence proof, not as an estimate of population performance.
- Coarse **screen-region classification** accuracies of up to **98% for a 2×1 grid** are reported in this literature, degrading sharply as the grid refines **[figure surfaced via secondary aggregation; I was not able to verify the exact source and conditions, so treat as unverified]**. The *shape* of that result — near-perfect at 2 regions, poor at many — is consistent with everything in §1 and is the right mental model.

Note what "coarse" buys you: knowing that gaze is in the left half versus right half of a code editor tells you nothing about AI assistance. The only coarse distinction with evidential value is **on-screen vs. off-screen**, and for that, gaze is the wrong instrument.

### 2.3 Head pose alone — the easier task, and the one that actually matters

If the question is "did the candidate turn to look at something that is not the laptop screen", **head-pose estimation is a far better fit than gaze estimation**, and it is a mature, well-benchmarked problem.

**Hempel, T., Abdelrahman, A. A., & Al-Hamadi, A. (2022). "6D Rotation Representation for Unconstrained Head Pose Estimation." *ICIP 2022*. arXiv:2202.12555.** https://arxiv.org/abs/2202.12555

Mean absolute error across yaw/pitch/roll on standard benchmarks:

| Method | AFLW2000 | BIWI |
|---|---|---|
| HopeNet (Ruiz et al., CVPRW 2018) | 6.16–6.41° | 4.90° |
| FSA-Net | — | 4.00° |
| WHENet-V (Zhou & Gregson, BMVC 2020) | 4.83° | 3.48° |
| **6DRepNet** | **3.97°** | **3.47°** |

Compare against §0: a second monitor is **30–40° off-axis**; a phone in the lap is **45–60°** down. Against a 3.5–6° MAE, those are **6–15 standard-error-units away**. This is not a hard classification problem.

The same conclusion is reached independently in the applied literature: head pose tracking is more robust than eye gaze tracking and is used as the complementary indicator when gaze quality falls below threshold.

**This is the crux of the assessment.** The *only* part of the proposal that is technically defensible — coarse "is the head oriented away from the screen" — **does not require gaze estimation at all**. And as §9.4 argues, even that has a cheaper, already-in-scope substitute for the specific inference this project wants to draw.

### 2.4 The failure that kills it regardless: the signal vanishes exactly when needed

Appearance-based gaze needs a detected face with resolvable eye regions. When the candidate turns 40° toward a second monitor, landmark detection degrades; at larger angles it fails outright. The published deep-learning webcam pipeline of Saxena et al. (§4) excluded **44.9%** of participants partly for **face detection failures**.

So the stream goes **missing in precisely the condition it was added to detect**. "Face not found" is then indistinguishable from "candidate leaned back", "someone walked past", "lighting changed", or "the model does not handle this face well" (§4.3). A detector whose null output is its own positive class is not a detector.

---

## 3. Calibration

### 3.1 How much is needed

Calibration is not optional and it is not cheap.

- **WebGazer** is the exception in requiring *no explicit* calibration — it self-calibrates from clicks and cursor movement (Papoutsaki et al. 2016). **This does not transfer to this project.** A candidate writing code in Monaco produces very few clicks, and the cursor sits where the caret is, not where the eyes are. WebGazer's entire calibration mechanism assumes a *browsing* interaction pattern that a coding task does not generate. Its self-calibration would degrade toward uncalibrated performance over a coding session.
- **Kaduk et al. (2023)** used a **5-minute** procedure: seven head poses × ~12 targets, with a pass threshold of <7% screen-size error.
- **RealEye** (used by Lau & Kasneci 2026) uses a **39-point calibration followed by 3-point validation**; participants who failed validation twice were **automatically ejected from the study**.
- **Falch & Lohan (2024)** used 4 points × ~2 s, and got 3.3°.
- **WebEyeTrack (2025)** is the current best-in-class here: **k ≤ 9 samples** via few-shot meta-learning.

### 3.2 How much calibration is worth

**Linardos, Kimura et al. / "Effect Of Personalized Calibration On Gaze Estimation Using Deep-Learning." arXiv:2109.12801.** https://arxiv.org/abs/2109.12801 — mean angular error falls from **5.02° uncalibrated to 2.22° calibrated**.

**Park, S., Mello, S. D., Molchanov, P., Iqbal, U., Hilliges, O., & Kautz, J. (2019). "Few-Shot Adaptive Gaze Estimation." *ICCV 2019*.** https://openaccess.thecvf.com/content_ICCV_2019/papers/Park_Few-Shot_Adaptive_Gaze_Estimation_ICCV_2019_paper.pdf — **3.18° on GazeCapture with as few as 3 samples**, a 19% improvement over prior art. Returns diminish fast: from 1 sample to 256 samples, the *relative* benefit of personalisation only moves from ~37.8% to ~30.5% error reduction (5.80°→4.03° vs 4.50°→2.80°).

So calibration roughly halves the error — and still lands at **2.2–3.2°**, which per §0 is **6–9 lines of code**.

### 3.3 Drift within a session — the finding that should end the discussion

This is where the proposal fails on its own terms, because a technical interview is *long*.

- **WebGazer on Eye of the Typer, 20-minute session: error rose 49% (7.79 cm → 11.62 cm). WebEyeTrack: +20% (7.24 cm → 8.72 cm).** (Davalos et al. 2025.) A model explicitly engineered for temporal robustness still loses a fifth of its accuracy in 20 minutes.
- **Lau & Kasneci (2026)**, on 205 valid datasets (228 recruited) using RealEye in a ~20-minute AI-interview study, fitted an ordered logistic regression for data quality and found **longer test durations predicted lower quality grades**, estimating a threshold at which an average participant has a **50% chance of a low-quality grade at 137 seconds** — about 46% of their 5-minute tracking window. They correctly caution this is setup-specific, not a universal cut-off. Even discounted heavily, the direction is unambiguous and it is the wrong direction for a 45–60 minute interview.
- Reviews attribute drift to loss of calibration without infrared assistance, and note webcam trackers **"requir[e] participants to recalibrate multiple times in order to continue an experiment"**, whereas commercial IR trackers typically calibrate once.

### 3.4 Does calibration survive posture change?

No, not well. Falch & Lohan (2024) measured it directly: **±100 mm lateral head movement pushed error from 3.2–3.3° to 4°**, and **±30°/±25° yaw/pitch pushed it to 5.1°**. Kaduk et al. (2023) needed a *virtual chinrest* to hold their 1.45°.

A candidate in a coding interview leans back to think, leans in to read, shifts in the chair, and stretches. Every one of those invalidates the calibration. There is no ethical way to prevent it and any attempt to would itself distort the behaviour under measurement.

---

## 4. Real-world robustness

### 4.1 Exclusion and attrition rates — the headline practical cost

These are the numbers to quote to anyone who thinks this is a small addition.

| Study | Setup | Data loss |
|---|---|---|
| **Saxena, S., Fink, L. K., & Lange, E. B. (2023/2024). "Deep learning models for webcam eye tracking in online experiments." *Behavior Research Methods* 56(4):3487–3503.** https://doi.org/10.3758/s13428-023-02190-6 | Online, deep models | **118 recruited → 65 analysed = 44.9% excluded** for inconsistent frame rates, face-detection failures, missing files |
| **Lau & Kasneci (2026)** | RealEye, AI interview, Prolific | 228 → 205 valid (10% excluded), plus participants auto-ejected for failing validation twice |
| **Kaduk et al. (2023)** | Lab, external HD cam, virtual chinrest | 23 → 19 → 17 |
| **Papoutsaki et al. (2016)** | WebGazer online | 82 → 76 |
| Aggregated webcam eye-tracking studies | Various | Average loss ~13%, with one experiment losing **72.7%** of recruits **[secondary aggregation, unverified against primary]** |
| One acceptance study | Remote webcam | **38.9% of datasets clearly invalid** **[secondary, unverified]** |

Also from Saxena et al.: with deep models, best fixation accuracy was **FAZE 2.44°**, then **ETH-XGaze 3.40°**, then **MPIIGaze 3.70°**, at a **mean 29.9 fps (SD 0.66)** — and that was after discarding 45% of participants.

**For an assessment system, an exclusion rate is not a data-quality footnote — it is a fairness problem.** "The system could not read your face, so we have no gaze evidence for you" is a materially different candidate experience from "the system read your face fine".

### 4.2 Eyeglasses, lighting, camera, distance

- **Eyeglasses**: reported as the *only* parameter that significantly affected accuracy in one commercial validation study **[vendor validation, treat cautiously]**; several academic online studies **explicitly exclude participants wearing glasses**, which is itself the finding. Occlusion of eye corners by frames breaks the landmark correspondences head-pose methods depend on.
- **Lighting**: variation in light sources affects pupil size and casts facial shadows, degrading eye-region localisation and causing data loss. WebGazer's own authors anticipate improvement only as "webcams capture better images in poor lighting".
- **Camera and frame rate**: Eye of the Typer webcam video is **640×480**. RealEye reports a nominal **10–60 Hz depending on device performance** — i.e. the sampling rate is a property of the candidate's laptop, not of your protocol.
- **Machine/OS**: Lau & Kasneci (2026) found **macOS users achieved significantly higher quality grades than Windows users (p = .021)**, and **wider browser windows** predicted better quality. Both are proxies for hardware the candidate happens to own.

That last point deserves emphasis: **the fidelity of the evidence against a candidate would correlate with how expensive their laptop is.**

### 4.3 Demographic bias — the finding that carries the most institutional risk

**Akgül, B., Şahin, E., & Kalkan, S. (2026). "Investigating Bias and Fairness in Appearance-based Gaze Estimation." arXiv:2604.10707.** https://arxiv.org/abs/2604.10707

The first systematic fairness evaluation of gaze estimation. Method: annotate **Gaze360** (715 session-identity pairs, 197,588 frames) and **GazeCapture** (1,474 sessions, 2,445,504 frames) for ethnicity and gender using FairFace with human validation of conflicts; evaluate CrossGaze, MCGaze, L2CS-Net, PureGaze, GazeTR; measure disparity by Wasserstein distance, Kolmogorov–Smirnov distance and t-tests.

Findings:

1. **"Gaze estimation datasets include severe bias across ethnicity groups"** — Afro-American and Asian sample counts are substantially lower than Caucasian in both datasets. Gender is roughly balanced and shows little dataset bias.
2. **All evaluated models produce biased outcomes**, with the **strongest disparity on the Caucasian–Afro-American pair**. Illustrative per-group errors on Gaze360: CrossGaze 9.84° vs 10.69°, MCGaze 10.25° vs 11.73°.
3. **Bias mitigation barely works here**: resampling and loss reweighting are the most effective of the strategies tried and still show "limited effectiveness", with "no consistent improvements across different models".

The absolute gaps (≈ 0.8–1.5°) may look small — but they are ~10–15% relative error inflation for one group, layered on top of a base error that is already too large for the fine-grained task, and they compound with the face-detection failure disparity documented in proctoring (§6.2), which is far larger.

WebEyeTrack's authors list **"improving model fairness"** as future work — the current best browser system does not claim to have addressed this.

**This is the decisive risk.** A tool whose output can contribute to an accusation of dishonesty, whose error rate varies by ethnicity, deployed by a university, is an unacceptable liability for a student project — and the mitigation literature says you cannot simply engineer the disparity away.

---

## 5. Browser feasibility and cost

### 5.1 It is technically possible, on-device, without frames leaving the machine

This part of the proposal is sound and should be conceded clearly.

- Capture via `getUserMedia()` (MDN: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), with `frameRate` and resolution constraints; the browser may downscale or reduce frame rate to satisfy them.
- Inference client-side via **TensorFlow.js** (WebGL or WASM/XNNPACK backends) and **MediaPipe Face Mesh / Iris** (468 3D landmarks, ~3 MB weights). WebEyeTrack demonstrates exactly this stack end-to-end, with **on-device calibration and inference so "user data never leaves the device"**.
- **Frames need not leave the machine.** WebGazer's authors call local processing "a critical requirement of any webcam eye tracker". Among vendors this genuinely varies: **RealEye states that no image or sound is sent to their servers and only gaze coordinates are stored [vendor claim]**, whereas **GazeRecorder streams participant video to its servers for gaze calculation [vendor claim, per a competitor's comparison — verify independently before relying on it]**. If this were ever built, on-device is the only defensible architecture.

### 5.2 Cost, and why it is a direct threat to *this* project's primary measurement

Reported costs:

- **WebEyeTrack**: **0.88 ms / ~1,137 fps** model inference on an Intel i7-11700F; **2.4 ms** on an iPhone 14; **670 KB / 0.16 M params / 0.15 GFLOPs**. **These are model-only figures.** They exclude MediaPipe landmark detection, `getUserMedia` frame delivery, and canvas transfer.
- **MediaPipe Iris "90+ FPS on CPU at ~5% CPU on an AMD Ryzen 7 3700U Pro" [blog benchmark, not peer-reviewed — treat as indicative only].**
- Canvas work is *not* free: repeated `drawImage()` into large canvases is a documented CPU cost, with pre-sizing and `OffscreenCanvas` recommended as mitigations.
- Real-world attainment lags these figures: Saxena et al. achieved **29.9 fps mean**, and RealEye reports **10–60 Hz depending on device**.

**Now the project-specific objection, which is the strongest engineering argument in this document.**

C1's entire thesis is **keystroke timing at millisecond resolution** — `mean_dwell_ms`, `std_dwell_ms`, `mean_flight_ms`, `std_flight_ms`, computed by pairing keydown↔keyup and consecutive keystrokes. Those measurements are taken by JavaScript **on the browser main thread**, stamped with `performance.now()` at capture.

Any work on that thread between the physical key event and the handler running is added directly to the measured dwell/flight time. A gaze pipeline is exactly such work: per-frame landmark detection, tensor preprocessing, inference, and canvas transfer, at 10–30 Hz, on the same thread as the editor and the capture listeners.

This matters more here than in a typical application for three reasons:

1. **The contamination is not noise, it is bias.** Frame processing is periodic. Periodic main-thread occupancy at 10–30 Hz beating against typing at 5–8 keys/sec produces *structured* jitter, not zero-mean error. Structured jitter in a timing feature is exactly what a classifier will latch onto.
2. **`performance.now()` is already coarsened and jittered for Spectre mitigation** — historically to 2 ms in Firefox and 100 ms + jitter in Chrome, later loosened to ~5 µs plus jitter within the same origin (see https://incolumitas.com/2021/12/18/on-high-precision-javascript-timers/). CLAUDE.md already flags a **timer-resolution probe** as required before real collection. Adding an uncontrolled CPU-contention source before that probe has even been run means measuring the instrument and the interference together.
3. **It confounds the flagship research deliverable.** The degradation experiments (`simulation/degrade.py`, `simulation/reliability_boundary.py`) deliberately perturb `perf_now` with *isolated, controlled* jitter and drift, and the stated contribution is precisely that the failure modes are isolated rather than bundled. A gaze pipeline injects an **uncontrolled, device-dependent jitter source into the clean baseline**. That does not merely add work — it undermines the novelty claim.

The mitigation (Web Worker + `OffscreenCanvas` + `requestVideoFrameCallback`) is real but non-trivial, is not what the reference implementations ship, and would itself need measuring. And the CPU is shared regardless of which thread the work is on.

---

## 6. Prior use in proctoring and cheating detection

### 6.1 What the enthusiastic literature reports

- **Singh, A., & Das, S. (2022). "A Cheating Detection System in Online Examinations Based on the Analysis of Eye-Gaze and Head-Pose." *EAI/ICISML*.** https://eudl.eu/doi/10.4108/eai.16-4-2022.2318165 — Dlib 68-point landmarks + a TensorFlow CNN pose model, thresholded on gaze angle and head orientation. **I read the full text: it contains a "Results Analysis" section that describes the landmark pipeline and shows figures, but reports no accuracy, precision, recall or false-positive rate for the proposed system, and no participant study.** It is a system description, not an evaluation. This is representative of a good deal of this sub-literature and is worth saying plainly in a paper.
- **Senaratne, A., et al. (2021). "Cheating Detection in Browser-based Online Exams through Eye Gaze Tracking." *IEEE ICIAfS/ICIIS*.** https://ieeexplore.ieee.org/document/9657277 — uses WebGazer; the authors themselves note **WebGazer's ~130 px error** and that accuracy is reduced by low-quality webcams and lighting. **Accuracy figures circulating for this paper could not be verified against the primary source (paywalled); do not cite a number for it without reading it.**
- Reported end-to-end accuracies elsewhere in the field cluster around **83–91%** for multimodal systems that combine gaze with head pose, object detection (phones, notes), mouth movement and hand tracking — i.e., **the gaze channel is never evaluated in isolation**, so its marginal contribution is unknown.
- **Ozgen, Yildirim, et al. "The Accuracy of AI-Based Automatic Proctoring in Online Exams." *Electronic Journal of e-Learning*.** https://academic-publishing.org/index.php/ejel/article/view/2600 — 244 exam attempts across 14 courses at a Middle Eastern university: **74 incorrect decisions (~30%)**; the AI flagged "positive" (cheating) more often than human proctors did (35.61% vs 25.95%).

### 6.2 What the critical literature reports — and it is stronger evidence

**Yoder-Himes, D. R., Asif, A., Kinney, K., Brandt, T. J., Cecil, R. E., Himes, P. R., Cashon, C., Hopp, R. M., & Ross, E. (2022). "Racial, skin tone, and sex disparities in automated proctoring software." *Frontiers in Education* 7:881449.** https://doi.org/10.3389/feduc.2022.881449

The single most important citation in this section. ~357 students across four large STEM courses, Respondus Monitor, skin tone coded on an expanded Fitzpatrick scale, 298 of 357 videos hand-coded for actual cheating and environmental factors:

| Metric | Darker skin | Medium | Lighter |
|---|---|---|---|
| **Facial detection rate** | **78%** | 87% | **92%** |
| **"Missing from frame" flags per assessment** | **4.79** | 1.39 | **0.83** |

Black vs White students differed significantly on detection (p<0.001) and on priority score (means **1.60 vs 1.23**, p<0.01). **A Black student was flagged as missing from frame roughly 5.8× more often than a lighter-skinned student, for the same behaviour.**

Supporting evidence:

- Independent testing found Proctorio's face-detection models **failed to detect faces in images labelled as containing Black faces 57% of the time**, and in near-identical poses detected a white face while missing a Black face in the same image (https://www.vice.com/en/article/proctorio-is-using-racist-algorithms-to-detect-faces/). **[Journalistic testing, not peer-reviewed — but methodologically transparent and directionally consistent with Yoder-Himes et al.]**
- **NIST (2019), Face Recognition Vendor Test Part 3: Demographic Effects** — higher false-positive rates for Asian and African American faces relative to Caucasian, and highest for African American women.

**Disability and neurodivergence.** Proctoring systems flag students who look away or move unusually; students who stim, have tics, have motor conditions, or use assistive equipment are penalised for non-malicious behaviour. See the **Center for Democracy and Technology, "How Automated Test Proctoring Software Discriminates Against Disabled Students"** (https://cdt.org/insights/how-automated-test-proctoring-software-discriminates-against-disabled-students/) and **"Surveillance and Disability in Online Proctored Exams: Student Perspectives and Design Implications" (2025, arXiv:2511.10826)** (https://arxiv.org/abs/2511.10826). Note the specific mechanism: **the flag trigger for the disability harm is literally "looks away from the screen" — which is the exact feature this proposal wants to add.**

**Student experience.** **Marano, E., Newton, P. M., Birch, Z., Croombs, M., Gilbert, C., & Draper, M. J. (2024). "What is the student experience of remote proctoring? A pragmatic scoping review." *Higher Education Quarterly* 78(3):1031–1047.** https://doi.org/10.1111/hequ.12506 — 21 studies; student experience **largely negative** on privacy, technical problems, fairness and stress; online proctoring had a **negative effect specifically on students with high anxiety**; some reported worse performance from hyper-awareness of surveillance. The authors recommend **limiting** the use of remote proctoring.

**Does it even work?** The evidence that proctoring reduces cheating is thin: reviews report "some, albeit limited, evidence", and note that few studies even state definitively whether exams were proctored.

**A vendor argues against it.** AutoProctor publicly explains why it **removed** eyeball tracking: too many false positives because "during an exam, it is natural for test-takers to look away from the screen while thinking"; administrators treated automated scores as verdicts rather than as items for review; and "if a human proctor can't make a confident decision based on gaze behavior alone, then how can an AI model do any better?" (https://blog.autoproctor.co/why-we-dont-use-eyeball-tracking-in-our-ai-proctoring/). **[Vendor blog, no data — but it is a vendor arguing against its own product category, which is the direction of bias that makes a claim more credible, not less.]**

### 6.3 The confound nobody in the proctoring literature handles: gaze aversion is a *thinking* behaviour

This is a scientific objection, not an ethical one, and it is independent of accuracy.

**Glenberg, A. M., Schroeder, J. L., & Robertson, D. A. (1998). "Averting the gaze disengages the environment and facilitates remembering." *Memory & Cognition* 26(4):651–658.** Five experiments: people avert gaze *more* as questions get harder; embarrassment does not explain it; **and looking away improves performance**. The mechanism is that averting gaze disengages costly environmental processing so internally-directed thought runs more efficiently.

**Doherty-Sneddon, G., & Phelps, F. G. (2005). "Gaze aversion: a response to cognitive or social difficulty?" *Memory & Cognition* 33(4):727–733**, and **Doherty-Sneddon, G., Riby, D. M., & Whittle, L. (2012). "Gaze aversion as a cognitive load management strategy in autism spectrum disorder and Williams syndrome." *Journal of Child Psychology and Psychiatry* 53(4):420–430.** https://doi.org/10.1111/j.1469-7610.2011.02481.x — difficulty has a strong effect on aversion rate; the behaviour is a **load-management strategy**, and its expression **differs in autism and Williams syndrome**.

Put together for this project:

- **Looking away from the screen is what a person does when a problem is hard.** A coding interview is a sustained hard-problem task. The base rate of the "suspicious" behaviour among honest candidates is high, and it is *highest for the candidates struggling most*.
- The behaviour's expression **varies with neurotype** — so a gaze-aversion feature is not merely noisy, it is **differentially noisy across a protected characteristic**, on top of the ethnicity disparity in §4.3 and §6.2.
- The direction of the error is the worst possible one: it penalises struggling and neurodivergent candidates, which is the opposite of what an integrity tool should do.

To be fair to the proposal: C2 would see gaze alongside keystroke features, and *gaze-away co-occurring with a large paste* is stronger evidence than either alone. But **the project already captures the blur/paste conjunction** (§9.4), and gaze adds the aversion confound without adding the discriminating fact.

---

## 7. Gaze in programming specifically

There is a genuine, high-quality literature here — and it uniformly used dedicated hardware.

- **Bednarik, R., & Tukiainen, M. (2006). "An eye-tracking methodology for characterizing program comprehension processes." *ETRA 2006*, pp. 125–132.** https://dl.acm.org/doi/10.1145/1117309.1117356 — 10 subjects debugging short Java programs in a multi-window IDE, using the Restricted Focus Viewer alongside eye tracking; analysed proportional fixation time per area of interest and attention-switch frequency between code and dynamic representations. Later work (Bednarik & Tukiainen, *Interacting with Computers*, 2011) found visual attention strategies sharpen with expertise over time, with fewer focus shifts.
- **Busjahn, T., Bednarik, R., Begel, A., Crosby, M., Paterson, J. H., Schulte, C., Sharif, B., & Tamm, S. (2015). "Eye movements in code reading: relaxing the linear order." *2015 IEEE 23rd International Conference on Program Comprehension (ICPC)*, pp. 255–265.** https://doi.org/10.1109/ICPC.2015.36 — the canonical result: **novices read source code less linearly than natural-language text (70% vs 80% linear eye movements), and experts read code less linearly still.** Non-linear reading skill increases with expertise.
- **Bednarik, R., Busjahn, T., Gibaldi, A., Ahadi, A., Bielikova, M., Crosby, M., Essig, K., Fagerholm, F., Jbara, A., Lister, R., Orlov, P., Paterson, J., Sharif, B., Sirkiä, T., Stelovsky, J., Tvarozek, J., Vrzakova, H., & van der Linde, I. (2020). "EMIP: The eye movements in programming dataset." *Science of Computer Programming* 198:102520.** https://doi.org/10.1016/j.scico.2020.102520 — **216 programmers**, eleven research teams, eight countries, four continents, **two SMI eye-tracking systems physically shipped between labs** to keep the apparatus identical; two code-comprehension tasks (11–22 lines). Released raw and unfiltered.
- **Sharafi, Z., Sharif, B., Guéhéneuc, Y.-G., Begel, A., Bednarik, R., & Crosby, M. (2020). "A practical guide on conducting eye tracking studies in software engineering." *Empirical Software Engineering* 25:3128–3174.** https://doi.org/10.1007/s10664-020-09829-4 — methodological standards for the field.
- **Sharafi, Z., Soh, Z., & Guéhéneuc, Y.-G. (2015). "A systematic literature review on the usage of eye-tracking in software engineering." *Information and Software Technology* 67:79–107.** The dominant analysis tools reported are **Tobii software, iTrace and Ogama**.
- **Guarnera, D. T., Bryant, C. A., Mishra, A., Maletic, J. I., & Sharif, B. (2018). "iTrace: Eye Tracking Infrastructure for Development Environments." *ETRA 2018*.** https://www.cs.kent.edu/~jmaletic/papers/ETRA18.pdf — the tooling that maps gaze onto *source code elements* inside Eclipse/Visual Studio, built because line- and token-level attribution requires it.

**The relevant observation for this project is not what these studies found, but what they needed.** Every finding above — line-level linearity, AOI-level attention switching, token-level regressions — depends on resolving gaze to **a line or a token**. The entire field built dedicated infrastructure (iTrace) and shipped physical SMI hardware across four continents to get that resolution, because it was not otherwise obtainable. Per §0 and §2.1, a laptop webcam resolves to **8–30 lines**. This project cannot reproduce any of these measurements, and should not imply otherwise.

**I found no study using webcam-only gaze to detect AI assistance or dishonesty in programming.** If C1 built one it would be novel — but novel in the sense of "attempting a measurement the field has established requires better instrumentation", which is a poor kind of novelty for a research contribution.

---

## 8. Privacy, ethics and law

### 8.1 Is facial/gaze data "biometric data"?

**Under GDPR:** Art. 4(14) defines biometric data as personal data from specific technical processing of physical, physiological or behavioural characteristics **"which allow or confirm the unique identification"** of a person. Art. 9(1) makes biometric data a special category **only "for the purpose of uniquely identifying a natural person"**. So gaze estimates used purely for attention inference arguably fall *outside* Art. 9. See ICO guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/

**Do not lean on that argument.** Three reasons:

1. Webcam gaze requires **capturing and processing facial video**. Even if the derived gaze vector is not Art. 9 data, the frames feeding it are personal data of the most sensitive practical kind, and their processing is high-risk regardless of the Art. 9 label.
2. Gaze patterns are themselves being studied as a **behavioural biometric**. Keystroke dynamics — which this project already treats correctly as "a real biometric" in `C1-captured-inputs-reference.md` §9 — went the same way. A defence that rests on "gaze is not technically identifying" is one paper away from failing.
3. A DPIA would be required anyway: recording video of identifiable people in an assessment context is textbook high-risk processing.

**Under the Sri Lankan Personal Data Protection Act No. 9 of 2022** — the governing regime for SLIIT — **biometric data is a special category requiring explicit consent or another lawful ground with enhanced safeguards.** Where consent is the basis, the controller must be able to demonstrate it, the request must be **clearly distinguishable** from other matters if bundled into a wider declaration, the data subject must be told consent can be **withdrawn at any time**, and freely-given-ness is assessed with **special attention to whether performance of a contract has been made conditional on consent to processing that is not necessary for it**. https://www.parliament.lk/uploads/acts/gbills/english/6242.pdf

That last clause is the problem. **Consent from an interview candidate or a graded student is not freely given in any meaningful sense** — there is a power imbalance and a conditional benefit. This is the same reasoning the EU used below.

### 8.2 EU AI Act — directly on point, and recent

- **Art. 5(1)(f)** prohibits placing on the market or using AI systems to **infer emotions of a natural person in the workplace and in education institutions**, in force since **2 February 2025**. Recital 44 grounds this in **power imbalances and the vulnerable position of workers and students**. Narrow carve-outs for medical/safety only. (Future of Privacy Forum analysis: https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/)
- **Annex III(1)(c)** classifies non-prohibited emotion recognition as **high-risk**.
- **Annex III(3)** explicitly lists AI used in **admissions, grading, student placement, and exam proctoring** as **high-risk**.

**Where does gaze/attention detection land?** Most likely *outside* the Art. 5(1)(f) prohibition — attention is not an emotion, and Recital 44 excludes physical states such as pain and fatigue. But an integrity-scoring system for interviews or assessments sits **squarely inside Annex III(3) as high-risk** regardless, and adding a camera-based attention inference moves it closer to the prohibited boundary rather than away from it. If the platform is ever positioned as an education or hiring tool in the EU, that is a conformity-assessment obligation, not a footnote.

The legal exposure is not hypothetical. **ProctorU** was sued under Illinois BIPA for collecting **eye movements, facial expressions and keystroke biometrics** without adequate retention and destruction policies, after a breach exposed ~500,000 users' data — the suit was dismissed on a **choice-of-law technicality** (Alabama law via terms of service), not on the merits. **Respondus settled a BIPA class action for $6.25M.** Note that the ProctorU complaint bundled **keystroke** biometrics with eye movements — this project is already in the adjacent category.

### 8.3 This is a scope expansion requiring fresh approval — not an increment

The project's own documents are unambiguous:

- **`docs/C1-captured-inputs-reference.md` §8, "What C1 Will Never Capture":** *"Screen contents, camera, microphone, other tabs or applications, clipboard contents never pasted into the editor, anything outside the browser tab, keystrokes outside the editor. Stated explicitly so a reviewer finds it stated, not discovers it missing."*
- **`docs/prototype-design-prompt.md`**, candidate-facing copy: *"**What we do not record:** your screen, your camera, your microphone, or anything outside this tab."*
- **`docs/C1-captured-inputs-reference.md` §9** already lists "Webcam frames" as **"Highly sensitive biometric"**, mitigation "Frame rate and retention policy", status **"⚠️ still undecided — flagged repeatedly across every prior document, needs an actual owner and a date."**

So the row exists, has been deferred repeatedly, and has no owner. Adding gaze would:

1. **Falsify a promise already made to candidates in the prototype UI.** Any prior consent obtained under that copy is void for this purpose.
2. Require **fresh ethics approval**, not an amendment — the `flagged_segments` ask (§7.2 of the inputs reference) is deliberately narrow *because* narrow asks get approved. A camera ask is the opposite kind of request and would plausibly jeopardise the narrow one by association.
3. Require, at minimum: a **DPIA**; explicit, separable, withdrawable consent under PDPA; a stated **retention and destruction schedule** for frames and derived vectors; a documented **on-device-only** processing architecture; a **non-participation path that does not disadvantage the candidate** (which, if honoured, means the feature cannot be relied upon anyway); and disclosure of **known demographic performance disparities** to both candidates and interviewers.
4. Force a decision on how an interviewer is shown a gaze flag whose error rate differs by skin tone — a C4 explainability problem with no good answer.

**Realistic timeline assessment:** a fresh camera-data ethics application at a university, for an assessment tool, in the current climate around proctoring, is not a two-week item. Against a project that has not yet built Phase 0 of C1, this is a schedule risk of the same order as the entire remaining build.

---

## 9. Verdict

### 9.1 Recommendation: **do not add webcam gaze tracking to C1.**

Not "not yet, pending calibration work" — **not for this project, at this scale.** The reasoning, in descending order of weight:

1. **It cannot do the fine task.** Line-level gaze needs ~0.4° resolution; laptop webcams deliver 3–10°, and 7–12 cm (≈19–30 lines) on the one dataset that measures people actually typing. That is a factor of ~10–25 short. No amount of engineering closes that on this hardware.
2. **The coarse task it *can* do does not need it.** Off-screen detection is a head-pose problem (3.5–6° MAE against a 30–60° signal), and the specific inference this project wants is already served by events it captures today (§9.4).
3. **Documented demographic bias, in a tool that produces accusations.** Gaze models show significant disparities that mitigation strategies do not fix (Akgül et al. 2026), and the proctoring precedent is worse: 78% vs 92% face detection by skin tone, 4.79 vs 0.83 missing-frame flags (Yoder-Himes et al. 2022). This alone is disqualifying for a student project without a fairness audit programme behind it.
4. **The core confound is unfixable.** Gaze aversion is a *thinking* behaviour that increases with task difficulty (Glenberg et al. 1998) and varies by neurotype (Doherty-Sneddon et al. 2012). The feature penalises struggling and neurodivergent candidates by construction.
5. **It threatens C1's own primary measurement.** A 10–30 Hz CV pipeline sharing the main thread with keystroke capture injects structured timing jitter into `dwell_ms`/`flight_ms` — and injects an uncontrolled jitter source into the *clean baseline* of the degradation experiments, whose stated contribution is that failure modes are isolated.
6. **It breaks a promise already in the product and needs fresh ethics approval** on a timeline comparable to the remaining build.
7. **It fails operationally.** Exclusion rates of 10–45%, session drift of 20–49% over 20 minutes, quality correlating with the candidate's operating system, and calibration invalidated by leaning back in a chair.

### 9.2 What the honest paper sentence looks like

> Webcam-based gaze estimation was evaluated as an additional capture stream and rejected. Published angular errors for consumer webcams (3–4.5° typical; 7–12 cm measured on laptop webcams during typing) correspond to 8–30 lines of code at normal editor settings, against the ~0.4° needed for line-level attribution — the resolution that the eye-tracking-in-programming literature obtains only with dedicated hardware (EMIP; iTrace). The coarse on-screen/off-screen discrimination that *is* achievable is better served by head-pose estimation, and in this system by browser focus and visibility events already captured. Documented demographic disparities in both gaze estimation and webcam proctoring, together with the established finding that gaze aversion is a cognitive-load response that increases with task difficulty and varies by neurotype, make it unsuitable as evidence in an integrity assessment.

That is a stronger contribution than a weak positive result. **A well-evidenced negative finding about a plausible-sounding sensor is publishable, defensible under examination, and cheap.**

### 9.3 Does it solve the "empty window" problem? **No — and the problem is misdiagnosed.**

The motivating argument was: *video frames arrive at a constant rate, so every time window would contain data.* Four objections, any one of which is sufficient.

**(a) The premise is false — the rate is not constant.** RealEye reports **10–60 Hz "depending on device performance"**; Saxena et al. excluded **44.9%** of participants partly for **inconsistent recording frame rates**; the achieved mean was 29.9 fps in a study that had already discarded nearly half its sample. The frame rate is a property of the candidate's laptop, not of the protocol.

**(b) The stream is missing precisely when the event occurs.** Face detection fails at large head angles and in poor lighting (§2.4). The window in which the candidate turns to a second monitor is disproportionately likely to be a window with **no gaze data at all** — and "no face" is indistinguishable from a dozen benign causes.

**(c) An empty window is not missing data — it is data, and C1 already models it correctly.** A 1 s window with no keystrokes means *the candidate did not type for a second*. That is a strong feature, not a gap. C1 already precomputes `gap_ms` at ingest **specifically so that pause features are window-size-independent**, and the continuous aggregate already emits `max(gap_ms)` per bucket. The architecture solved this before the question was asked. The right framing is not "the window is empty" but "the window's value is *silence*", and silence before a large paste is exactly the pattern the project targets.

**(d) A constant-rate noisy channel is worse than an honest null.** Filling every window with a 3–10°-error, 200–700 ms-lagged, drifting estimate does not add information — it adds a plausible-looking column that a classifier will fit, that inflates apparent feature coverage, and that will *contaminate the reliability-boundary experiment* by supplying signal whose degradation profile is unknown and uncontrolled. For a project whose headline contribution is measuring how classifier confidence degrades under *isolated, controlled* corruption, importing an uncontrolled corruption source into the clean baseline is self-defeating.

**If constant-rate presence really is wanted**, it is available for free and already in scope: a 1 Hz heartbeat/presence tick, the current focus state sampled per window, editor viewport scroll position, selection changes, or simply the existing `blur`/`focus`/`visibilitychange` state carried forward as a window-level attribute. All are deterministic, zero-bias, zero-cost, and require no ethics change.

### 9.4 The cheaper signal that achieves a similar aim — mostly already built

The actual inference wanted is: **"attention left the coding window, and shortly afterwards a large block of code appeared."** C1's existing schema already captures both halves.

| Signal | Status | What it gives |
|---|---|---|
| `blur` / `focus` (kinds 3–4) | **In the v3 schema** | Focus left the tab — the highest-precision available proxy for "attention went elsewhere" |
| `visibilitychange` (kind 5) | **In the v3 schema** | Tab hidden vs visible — distinguishes "switched away" from "clicked something else in-page" |
| `fullscreenchange` (kind 6), `resize` (kind 7) | **In the v3 schema** | Window rearrangement, e.g. making room for a second window |
| `origin = paste`, `inserted_len` | **In the v3 schema** | The other half of the conjunction |
| `gap_ms` (precomputed at ingest) | **In the v3 schema** | Pause structure, window-size-independent |
| **`screen.isExtended`** | **Not captured — worth considering** | A **boolean**, available in secure contexts **without a permission prompt** in Chromium, that says whether the machine has more than one display. https://developer.mozilla.org/en-US/docs/Web/API/Screen/isExtended |

`screen.isExtended` deserves a serious look as the *actual* cheap answer to the second-monitor hypothesis. It is one boolean, needs no camera, no permission dialog, no calibration, no per-frame CPU, and no new ethics category — and it directly conditions the interpretation of a blur event. A blur on a single-display machine and a blur on a two-display machine are different evidence. Caveats to state honestly: Chromium-only (Firefox and Safari lack support), it can be suppressed by a `window-management` Permissions-Policy, it reveals a (mild) fingerprinting surface so it should still be disclosed in the consent copy, and **it says a second display exists, never that it was used**.

Combined rule of thumb, achievable today with zero new capture: **blur → duration → paste of length N**, conditioned on `isExtended`. That is a stronger and far more defensible feature than any gaze estimate this hardware can produce.

**And the honest limit must be restated, because it already appears in `C1-data-and-capture-feasibility.md` and adding a camera does not repeal it:** blur tells you focus left; it never tells you where it went. Gaze would not fix this either — a candidate reading a phone below the desk produces a downward head pose indistinguishable from looking at the keyboard, which is what touch-typists and non-touch-typists both do constantly (this is the entire subject of the Eye of the Typer paper). **The device-typing-at-human-speed limitation that the project already commits to stating in the paper applies to gaze with equal force.**

### 9.5 The narrow version, if the team insists on carrying something forward

If a supervisor requires that the camera idea be pursued rather than closed, the only defensible form is **not gaze**:

- **Head pose only** (yaw/pitch), from **MediaPipe landmarks + a 6DRepNet-class model**, thresholded to a single coarse binary: *head oriented substantially away from the screen*, yes/no.
- **Off the main thread** — Web Worker + `OffscreenCanvas` — with a **measured** before/after comparison of `dwell_ms`/`flight_ms` distributions proving no timing contamination. If contamination is measurable, stop.
- **On-device only**; frames never persisted, never transmitted, discarded after inference; only the boolean and its timestamp stored.
- **Never a feature fed to C2 in the baseline model.** At most a *separate*, clearly-labelled corroborating channel, so the classifier's reported performance stays interpretable and the degradation experiments keep a clean baseline.
- **Explicitly excluded from the accuracy-vs-privacy curve and the reliability-boundary experiment**, both of which assume a controlled feature set.
- Fresh ethics approval, DPIA, opt-out with no penalty, and disclosed demographic performance limitations.

That is a substantial amount of work whose best case is a coarse boolean that `blur` + `isExtended` largely already provides. I do not recommend it. It is documented here so the decision is visibly a decision rather than an omission.

---

## 10. Open questions / what we would need to test ourselves

Nothing in the literature answers these for *this* deployment. If the team wanted to overturn the recommendation, these are the experiments that would have to come first — and the first one is cheap enough to be worth running regardless.

1. **[Highest priority — run this even if gaze is dropped] Main-thread contention against keystroke timing.** Take the timer-resolution probe CLAUDE.md already requires, then extend it: measure `dwell_ms` and `flight_ms` distributions on a real typing task **with and without** a MediaPipe face-landmark pipeline running at 15 and 30 fps, on the lowest-spec target laptop. Report the shift in mean, the shift in SD, and the autocorrelation of the residual at the frame period. **If the residual shows structure at the frame rate, that is a hard stop** — and it is also a useful result for the paper regardless of the gaze decision, because it bounds how much *any* concurrent client-side work can be tolerated.
2. **Base rate of gaze aversion among honest candidates.** Instrument nothing but focus/blur, run N honest interviews, and measure how often and how long attention leaves the window with no dishonesty present. Without this number, no threshold on any away-from-screen signal — gaze or blur — can be set, and the false-positive rate of the feature C1 *already ships* is unknown. **This is the single most useful measurement in the list and it needs no camera.**
3. **Does `blur` + `isExtended` + paste-length actually separate the classes?** Before adding a sensor, establish the ceiling of the sensors already present. If the existing conjunction already separates `external_ai` acceptably, the gaze question is moot; if it does not, the shortfall tells you what a new sensor would have to supply.
4. **Achievable frame rate and face-detection rate on the actual candidate population.** Sri Lankan students' laptops, in their own lighting, at their own desks. Measure: fps distribution, face-detection success rate, and — critically — **whether detection failure rate correlates with skin tone in the local population**. Do not import a US-derived disparity estimate; do not assume it is absent either.
5. **Head-pose separability under realistic geometry.** With a webcam, an actual second monitor and a phone at lap height, measure the yaw/pitch distributions for (i) reading the laptop screen, (ii) reading the second monitor, (iii) reading a phone, (iv) **looking at the keyboard while touch-typing**, and (v) **looking away while thinking**. The interesting question is not (i) vs (ii) — that is easy — it is **(iii) vs (iv)** and **(ii) vs (v)**. If those overlap, the coarse version fails too.
6. **Drift over a realistic session length.** All the drift evidence is from 5–20 minute sessions. A technical interview is 45–60 minutes. Extrapolating WebGazer's +49%/20 min is not safe in either direction; it needs measuring.
7. **Effect of the calibration procedure on the behaviour being measured.** A 39-point or 5-minute calibration before a stressful interview is not behaviourally neutral. Does it change baseline typing rhythm in the first minutes? If so it corrupts the keystroke features, which are the actual product.
8. **Whether `screen.isExtended` is even informative in the target population.** What fraction of candidates have a second display attached at all? If it is 5%, it is a niche conditioner; if it is 40%, it materially changes how blur events should be read. One line of telemetry answers this.
9. **Ethics timeline, obtained as a fact rather than an estimate.** Before any of the above, ask the SLIIT ethics board directly how long a camera-data amendment takes and what it requires. If the answer exceeds the remaining project timeline, items 4–7 are moot and the question is closed on schedule grounds alone.

---

## References

**Webcam and appearance-based gaze estimation**

- Papoutsaki, A., Sangkloy, P., Laskey, J., Daskalova, N., Huang, J., & Hays, J. (2016). WebGazer: Scalable Webcam Eye Tracking Using User Interactions. *IJCAI 2016*. https://www.ijcai.org/Proceedings/16/Papers/540.pdf
- Papoutsaki, A., Gokaslan, A., Tompkin, J., He, Y., & Huang, J. (2018). The eye of the typer: a benchmark and analysis of gaze behavior during typing. *ETRA 2018*. https://dl.acm.org/doi/10.1145/3204493.3204552 · dataset https://webgazer.cs.brown.edu/data/
- Zhang, X., Sugano, Y., Fritz, M., & Bulling, A. (2015). Appearance-Based Gaze Estimation in the Wild. *CVPR 2015*. https://openaccess.thecvf.com/content_cvpr_2015/papers/Zhang_Appearance-Based_Gaze_Estimation_2015_CVPR_paper.pdf
- Zhang, X., Sugano, Y., Fritz, M., & Bulling, A. (2019). MPIIGaze: Real-World Dataset and Deep Appearance-Based Gaze Estimation. *IEEE TPAMI* 41(1). https://arxiv.org/abs/1711.09017
- Zhang, X., Sugano, Y., Fritz, M., & Bulling, A. (2017). It's Written All Over Your Face: Full-Face Appearance-Based Gaze Estimation. *CVPRW 2017*. https://arxiv.org/abs/1611.08860
- Krafka, K., Khosla, A., Kellnhofer, P., Kannan, H., Bhandarkar, S., Matusik, W., & Torralba, A. (2016). Eye Tracking for Everyone. *CVPR 2016*. https://www.cv-foundation.org/openaccess/content_cvpr_2016/papers/Krafka_Eye_Tracking_for_CVPR_2016_paper.pdf
- Huang, Q., Veeraraghavan, A., & Sabharwal, A. (2017). TabletGaze. *Machine Vision and Applications* 28(5–6). https://arxiv.org/abs/1508.01244
- Wood, E., & Bulling, A. (2014). EyeTab: Model-based gaze estimation on unmodified tablet computers. *ETRA 2014*. https://dl.acm.org/doi/10.1145/2578153.2578185
- Zhang, X., Park, S., Beeler, T., Bradley, D., Tang, S., & Hilliges, O. (2020). ETH-XGaze. *ECCV 2020*. https://ait.ethz.ch/xgaze
- Abdelrahman, A. A., Hempel, T., Khalifa, A., & Al-Hamadi, A. (2022). L2CS-Net. arXiv:2203.03339. https://arxiv.org/abs/2203.03339
- Valliappan, N., et al. (2020). Accelerating eye movement research via accurate and affordable smartphone eye tracking. *Nature Communications* 11:4553. https://www.nature.com/articles/s41467-020-18360-5
- Davalos, E., et al. (2025). WebEyeTrack: Scalable Eye-Tracking for the Browser via On-Device Few-Shot Personalization. arXiv:2508.19544. https://arxiv.org/abs/2508.19544
- Falch, L., & Lohan, K. S. (2024). Webcam-based gaze estimation for computer screen interaction. *Frontiers in Robotics and AI* 11:1369566. https://doi.org/10.3389/frobt.2024.1369566
- Kaduk, T., Goeke, C., Finger, H., & König, P. (2023). Webcam eye tracking close to laboratory standards. *Behavior Research Methods*. https://doi.org/10.3758/s13428-023-02237-8
- Saxena, S., Fink, L. K., & Lange, E. B. (2024). Deep learning models for webcam eye tracking in online experiments. *Behavior Research Methods* 56(4):3487–3503. https://doi.org/10.3758/s13428-023-02190-6
- Lau, K. H. C., & Kasneci, E. (2026). What Shapes Participant Data Quality? *Proc. ACM Hum.-Comput. Interact.* 10(3), ETRA003. https://arxiv.org/abs/2605.02898
- Patterson et al. (2025). Methodological recommendations for webcam-based eye tracking: A scoping review. *Computers in Human Behavior Reports*. https://www.sciencedirect.com/science/article/pii/S2772766125000655
- Park, S., et al. (2019). Few-Shot Adaptive Gaze Estimation. *ICCV 2019*. https://openaccess.thecvf.com/content_ICCV_2019/papers/Park_Few-Shot_Adaptive_Gaze_Estimation_ICCV_2019_paper.pdf
- Effect Of Personalized Calibration On Gaze Estimation Using Deep-Learning (2021). arXiv:2109.12801. https://arxiv.org/abs/2109.12801

**Head pose**

- Hempel, T., Abdelrahman, A. A., & Al-Hamadi, A. (2022). 6D Rotation Representation for Unconstrained Head Pose Estimation. *ICIP 2022*. https://arxiv.org/abs/2202.12555
- Ruiz, N., Chong, E., & Rehg, J. M. (2018). Fine-Grained Head Pose Estimation Without Keypoints (HopeNet). *CVPRW 2018*.
- Zhou, Y., & Gregson, J. (2020). WHENet: Real-time Fine-Grained Estimation for Wide Range Head Pose. *BMVC 2020*.

**Fairness and bias**

- Akgül, B., Şahin, E., & Kalkan, S. (2026). Investigating Bias and Fairness in Appearance-based Gaze Estimation. arXiv:2604.10707. https://arxiv.org/abs/2604.10707
- Yoder-Himes, D. R., et al. (2022). Racial, skin tone, and sex disparities in automated proctoring software. *Frontiers in Education* 7:881449. https://doi.org/10.3389/feduc.2022.881449
- Grother, P., Ngan, M., & Hanaoka, K. (2019). *Face Recognition Vendor Test Part 3: Demographic Effects*. NIST IR 8280. https://doi.org/10.6028/NIST.IR.8280

**Proctoring: systems, evaluation and critique**

- Singh, A., & Das, S. (2022). A Cheating Detection System in Online Examinations Based on the Analysis of Eye-Gaze and Head-Pose. *EAI/ICISML*. https://eudl.eu/doi/10.4108/eai.16-4-2022.2318165
- Senaratne, A., et al. (2021). Cheating Detection in Browser-based Online Exams through Eye Gaze Tracking. *IEEE*. https://ieeexplore.ieee.org/document/9657277
- The Accuracy of AI-Based Automatic Proctoring in Online Exams. *Electronic Journal of e-Learning*. https://academic-publishing.org/index.php/ejel/article/view/2600
- Marano, E., Newton, P. M., Birch, Z., Croombs, M., Gilbert, C., & Draper, M. J. (2024). What is the student experience of remote proctoring? *Higher Education Quarterly* 78(3):1031–1047. https://doi.org/10.1111/hequ.12506
- Surveillance and Disability in Online Proctored Exams (2025). arXiv:2511.10826. https://arxiv.org/abs/2511.10826
- Center for Democracy and Technology. How Automated Test Proctoring Software Discriminates Against Disabled Students. https://cdt.org/insights/how-automated-test-proctoring-software-discriminates-against-disabled-students/
- Electronic Frontier Foundation (2021). A Long Overdue Reckoning For Online Proctoring Companies May Finally Be Here. https://www.eff.org/deeplinks/2021/06/long-overdue-reckoning-online-proctoring-companies-may-finally-be-here
- Vice (2021). Proctorio Is Using Racist Algorithms to Detect Faces. https://www.vice.com/en/article/proctorio-is-using-racist-algorithms-to-detect-faces/
- AutoProctor. Why we don't Use Eyeball Tracking in our AI Proctoring. [vendor blog] https://blog.autoproctor.co/why-we-dont-use-eyeball-tracking-in-our-ai-proctoring/

**Gaze aversion and cognitive load**

- Glenberg, A. M., Schroeder, J. L., & Robertson, D. A. (1998). Averting the gaze disengages the environment and facilitates remembering. *Memory & Cognition* 26(4):651–658. https://doi.org/10.3758/BF03211385
- Doherty-Sneddon, G., & Phelps, F. G. (2005). Gaze aversion: a response to cognitive or social difficulty? *Memory & Cognition* 33(4):727–733. https://doi.org/10.3758/BF03195338 — 36 eight-year-olds, questioned face-to-face vs. over a live video link, across arithmetic, verbal reasoning and autobiographical/episodic memory items of varying difficulty.
- Doherty-Sneddon, G., Riby, D. M., & Whittle, L. (2012). Gaze aversion as a cognitive load management strategy in autism spectrum disorder and Williams syndrome. *Journal of Child Psychology and Psychiatry* 53(4):420–430. https://doi.org/10.1111/j.1469-7610.2011.02481.x

**Eye tracking in programming**

- Bednarik, R., & Tukiainen, M. (2006). An eye-tracking methodology for characterizing program comprehension processes. *ETRA 2006*. https://dl.acm.org/doi/10.1145/1117309.1117356
- Busjahn, T., Bednarik, R., Begel, A., Crosby, M., Paterson, J. H., Schulte, C., Sharif, B., & Tamm, S. (2015). Eye movements in code reading: relaxing the linear order. *2015 IEEE 23rd International Conference on Program Comprehension (ICPC)*, pp. 255–265. https://doi.org/10.1109/ICPC.2015.36
- Bednarik, R., Busjahn, T., Gibaldi, A., Ahadi, A., Bielikova, M., Crosby, M., Essig, K., Fagerholm, F., Jbara, A., Lister, R., Orlov, P., Paterson, J., Sharif, B., Sirkiä, T., Stelovsky, J., Tvarozek, J., Vrzakova, H., & van der Linde, I. (2020). EMIP: The eye movements in programming dataset. *Science of Computer Programming* 198:102520. https://doi.org/10.1016/j.scico.2020.102520
- Sharafi, Z., Sharif, B., Guéhéneuc, Y.-G., Begel, A., Bednarik, R., & Crosby, M. (2020). A practical guide on conducting eye tracking studies in software engineering. *Empirical Software Engineering* 25:3128–3174. https://doi.org/10.1007/s10664-020-09829-4
- Sharafi, Z., Soh, Z., & Guéhéneuc, Y.-G. (2015). A systematic literature review on the usage of eye-tracking in software engineering. *Information and Software Technology* 67:79–107.
- Guarnera, D. T., Bryant, C. A., Mishra, A., Maletic, J. I., & Sharif, B. (2018). iTrace: Eye Tracking Infrastructure for Development Environments. *ETRA 2018*. https://www.cs.kent.edu/~jmaletic/papers/ETRA18.pdf

**Law, ethics and platform APIs**

- Personal Data Protection Act, No. 9 of 2022 (Sri Lanka). https://www.parliament.lk/uploads/acts/gbills/english/6242.pdf
- Regulation (EU) 2016/679 (GDPR), Arts. 4(14) and 9. ICO guidance on special category data: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/
- Regulation (EU) 2024/1689 (AI Act), Art. 5(1)(f), Recital 44, Annex III(1)(c) and Annex III(3). Analysis: Future of Privacy Forum, *Red Lines under EU AI Act*. https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/
- *Thakkar et al. v. ProctorU Inc.* (BIPA; dismissed on choice-of-law grounds). https://www.classaction.org/news/online-test-taking-software-proctoru-violates-ill-privacy-law-class-action-alleges
- MDN. `MediaDevices.getUserMedia()`. https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- MDN. `Screen.isExtended`. https://developer.mozilla.org/en-US/docs/Web/API/Screen/isExtended
- MDN. Page Visibility API. https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- On High-Precision JavaScript Timers (2021). https://incolumitas.com/2021/12/18/on-high-precision-javascript-timers/

**Internal documents referenced**

- `docs/C1 - telemetry-project-brief.md`
- `docs/C1-data-and-capture-feasibility.md`
- `docs/C1-captured-inputs-reference.md` (v3) — §8 "What C1 Will Never Capture", §9 Privacy Risk Summary
- `docs/C1-mvp-implementation-plan.md`
- `docs/prototype-design-prompt.md` — candidate-facing "What we do not record" copy
