'use client';

import Image from 'next/image';
import { useState } from 'react';

const issues = [
  'Có ý tưởng nhưng lại im lặng khi mọi người nhìn về phía mình.',
  'Biết mình muốn nói gì nhưng chưa tìm được từ ngữ đủ chính xác nên phải giải thích dài hơn.',
  'Người nghe vẫn chưa nắm được điều cốt lõi trong đề xuất.',
  'Khi bị hỏi ngược hoặc phản biện, bắt đầu nghi ngờ chính mình.',
];

const outcomes = [
  ['Rõ', 'Biết mình muốn người nghe hiểu hoặc quyết định điều gì.'],
  ['Mạch lạc', 'Sắp xếp ý tưởng thành một thông điệp dễ theo dõi.'],
  ['Vững', 'Tiếp tục đối thoại khi quan điểm được đặt câu hỏi.'],
  ['Chủ động', 'Dám trình bày và bảo vệ điều mình tin là đáng được cân nhắc.'],
] as const;

const mechanism = [
  ['01', 'Nhìn rõ điều đang cản bạn lên tiếng', 'Bắt đầu từ một tình huống cụ thể để nhận diện suy nghĩ, nỗi sợ và niềm tin.'],
  ['02', 'Làm rõ điều bạn muốn nói', 'Xác định trọng tâm, sắp xếp ý tưởng và luyện cách mở đầu, trình bày, trả lời hoặc bảo vệ quan điểm.'],
  ['03', 'Áp dụng và nhận phản hồi', 'Đưa điều đã luyện vào tình huống thật, cùng xem lại và điều chỉnh cho lần tiếp theo.'],
] as const;

const process = [
  ['Nhận diện', 'Nhìn rõ tình huống và điều khiến bạn chùn lại.'],
  ['Chuẩn bị và luyện tập', 'Sắp xếp ý tưởng, luyện trình bày và bảo vệ quan điểm.'],
  ['Áp dụng và phản hồi', 'Thử trong công việc, xem lại và điều chỉnh.'],
] as const;

const faqs = [
  ['Coaching này khác gì với một khóa học thuyết trình?', 'Lộ trình bắt đầu từ tình huống thật, đồng thời làm việc với rào cản bên trong, cách sắp xếp ý tưởng và khả năng tiếp tục đối thoại.'],
  ['Tôi chưa biết chính xác vấn đề của mình là gì. Tôi có thể đặt lịch không?', 'Có. Chỉ cần mang theo một tình huống gần đây; cuộc gọi sẽ giúp hai bên xem hướng coaching có phù hợp hay không.'],
  ['Tôi cần dành bao nhiêu thời gian ngoài buổi coaching?', 'Mỗi tuần có một buổi 60 phút; ngoài ra có thể cần thời gian chuẩn bị hoặc thử áp dụng một cách thể hiện mới.'],
  ['Coaching có giúp tôi chắc chắn được cấp trên đồng ý hoặc ghi nhận không?', 'Không. Coaching tập trung vào phần bạn có thể chủ động thay đổi.'],
  ['Nếu vấn đề chính của tôi là tiếng Anh thì coaching này có phù hợp không?', 'Phù hợp hơn khi bạn đã hiểu nội dung nhưng khó diễn đạt rõ hoặc thiếu vững vàng khi trao đổi bằng tiếng Anh.'],
  ['Trường hợp nào không phù hợp?', 'Coaching không thay thế trị liệu tâm lý, hỗ trợ y tế hoặc một lớp kỹ thuật thuyết trình thuần túy.'],
] as const;

export default function Home() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand-mark" href="#top" aria-label="Về đầu trang">Coach Anh Thư</a>
        <a className="header-cta" href="#booking">Đặt lịch 30 phút <span aria-hidden="true">↗</span></a>
      </header>

      <div id="top" className="hero section-shell">
        <div className="hero-copy">
          <p className="eyebrow">Coaching 1-1 cho giao tiếp công việc</p>
          <h1>Nói rõ điều bạn biết. Đứng vững với điều bạn tin.</h1>
          <p className="hero-lead">Coaching 1-1 dành cho người đi làm có năng lực nhưng chưa tự tin khi phát biểu, trình bày hoặc bảo vệ ý tưởng.</p>
          <a className="primary-button" href="#booking">Đặt lịch 30 phút <span aria-hidden="true">↗</span></a>
          <p className="hero-support">Cùng xem tình huống của bạn có phù hợp với coaching hay không.</p>
        </div>
        <div className="hero-visual">
          <Image src="/images/hero-anh-thu-white-frame.png" alt="Chân dung Coach Anh Thư trong khung trắng trên nền Terracotta" width={1134} height={1134} priority />
          <div className="hero-visual-caption">
            <strong>Coach Anh Thư</strong>
            <strong>Confidence &amp; Self-Leadership coach</strong>
            <span>Với hơn 10 năm kinh nghiệm làm việc trong môi trường quốc tế</span>
          </div>
        </div>
      </div>

      <section className="section-shell section-white" id="problem">
        <div className="section-intro narrow-intro">
          <p className="eyebrow">Khoảnh khắc nhận ra vấn đề</p>
          <h2>Bạn không thiếu năng lực.</h2>
          <p>Có thể bạn đang thiếu một cách rõ ràng và đủ an toàn để đưa điều mình biết vào cuộc trò chuyện.</p>
        </div>
        <div className="issue-grid">
          {issues.map((issue, index) => (
            <article className="issue-item" key={issue}>
              <span className="issue-index">0{index + 1}</span>
              <p>{issue}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell section-mist" id="outcome">
        <div className="section-intro">
          <p className="eyebrow">Kết quả khách thực sự muốn</p>
          <h2>Không cần nói nhiều hơn để chứng minh mình giỏi.</h2>
          <p>Bạn cần một cách để đưa điều mình biết vào cuộc trò chuyện rõ ràng hơn.</p>
        </div>
        <div className="outcome-grid">
          {outcomes.map(([title, description]) => (
            <article className="outcome-card" key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <a className="text-link" href="#mechanism">Xem cách lộ trình được triển khai <span aria-hidden="true">→</span></a>
      </section>

      <section className="section-shell section-white" id="mechanism">
        <div className="section-intro narrow-intro">
          <p className="eyebrow">Cách tiếp cận</p>
          <h2>Không chỉ luyện cách nói. Cùng nhìn rõ điều đang khiến bạn chưa thể nói như mình muốn.</h2>
        </div>
        <div className="mechanism-grid">
          {mechanism.map(([index, title, description]) => (
            <article className="mechanism-item" key={index}>
              <span className="step-index">{index}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <p className="mechanism-close">Bên trong đủ an toàn — thông điệp đủ rõ — cách thể hiện đủ vững.</p>
      </section>

      <section className="section-shell section-mist offer-section" id="offer">
        <div className="offer-copy">
          <p className="eyebrow">Offer</p>
          <h2>Rõ Ý Tưởng, Vững Quan Điểm</h2>
          <p>Một lộ trình 1-1 để bạn làm việc trên một tình huống giao tiếp thật.</p>
        </div>
        <div className="offer-card">
          <p className="offer-kicker">Lộ trình coaching 1-1 trong 3 tháng</p>
          <p className="offer-price">xx.000.000 <span>VNĐ / 3 tháng</span></p>
          <ul className="offer-list">
            <li>Mỗi tuần một buổi 60 phút.</li>
            <li>Tập trung vào một chuyển biến cụ thể trong giao tiếp công việc.</li>
            <li>Kết hợp coaching nội tâm, luyện trình bày và phản hồi.</li>
            <li>Làm việc trên cuộc họp, trình bày ý tưởng hoặc bảo vệ quan điểm thật.</li>
          </ul>
          <a className="secondary-button" href="#booking">Đặt lịch 30 phút <span aria-hidden="true">↗</span></a>
          <p className="offer-note">Lộ trình không cam kết cấp trên sẽ đồng ý, dự án sẽ được phê duyệt hoặc bạn chắc chắn đạt một kết quả nghề nghiệp cụ thể.</p>
        </div>
      </section>

      <section className="section-shell section-white" id="process">
        <div className="section-intro narrow-intro">
          <p className="eyebrow">Quy trình 3 tháng</p>
          <h2>Lộ trình diễn ra như thế nào?</h2>
          <p>Mỗi chặng bắt đầu từ vấn đề thực tế của bạn, không phải một công thức giao tiếp áp dụng giống nhau cho tất cả mọi người.</p>
        </div>
        <div className="process-grid">
          {process.map(([title, description], index) => (
            <article className="process-item" key={title}>
              <span className="step-index">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell section-mist proof-section" id="proof">
        <div className="proof-image-wrap">
          <Image src="/images/hero-anh-thu-white-frame.png" alt="Coach Anh Thư" width={1134} height={1134} />
        </div>
        <div className="proof-copy">
          <p className="eyebrow">Proof có thể xác minh</p>
          <h2>Coach Anh Thư</h2>
          <p className="proof-role">Confidence &amp; Self-Leadership coach</p>
          <p>Với hơn 10 năm kinh nghiệm làm việc trong môi trường quốc tế, tôi hiểu rằng một ý tưởng không chỉ cần đúng. Nó còn cần được diễn đạt theo cách người khác có thể hiểu, đặt câu hỏi và cùng trao đổi.</p>
          <p>Trong coaching, tôi kết hợp sự lắng nghe và không gian an toàn, tư duy rõ ràng có cấu trúc, cùng việc luyện tập trên những tình huống giao tiếp công việc thật.</p>
          <p className="proof-boundary">Chưa đưa testimonial hoặc logo vào trang khi chưa có xác nhận và quyền sử dụng.</p>
        </div>
      </section>

      <section className="section-shell section-white faq-section" id="faq">
        <div className="section-intro">
          <p className="eyebrow">FAQ</p>
          <h2>Một vài câu hỏi bạn có thể đang băn khoăn.</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer], index) => (
            <details key={question} open={index === 0}>
              <summary>{question}<span aria-hidden="true">+</span></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="booking-section" id="booking">
        <div className="booking-inner section-shell">
          <div className="booking-copy">
            <p className="eyebrow eyebrow-light">Bắt đầu từ một tình huống cụ thể</p>
            <h2>Đặt lịch 30 phút để xem coaching có phù hợp với bạn không.</h2>
            <p>Bạn không cần chuẩn bị một câu chuyện hoàn hảo. Chỉ cần chia sẻ tình huống khiến bạn cảm thấy mình chưa thể hiện được điều muốn nói.</p>
          </div>
          <form className="lead-form" onSubmit={handleSubmit}>
            <label>Họ và tên<input name="name" required placeholder="Tên của bạn" /></label>
            <label>Email<input name="email" type="email" required placeholder="you@example.com" /></label>
            <label>Tình huống giao tiếp bạn muốn cải thiện<textarea name="situation" required placeholder="Ví dụ: trình bày một ý tưởng trong cuộc họp..." /></label>
            <button className="form-button" type="submit">Đặt lịch 30 phút <span aria-hidden="true">↗</span></button>
            {submitted && <output className="form-status">Bản demo đã nhận thông tin trên màn hình. Cần kết nối công cụ nhận lead trước khi chạy thật.</output>}
          </form>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-inner section-shell">
          <div className="footer-brand">
            <strong>Coach Anh Thư</strong>
            <span>Confidence &amp; Self-Leadership coach</span>
            <span>Coaching 1-1 cho giao tiếp công việc.</span>
          </div>
          <div className="footer-links">
            <span>Thông tin liên hệ demo</span>
            <span>Chính sách bảo mật</span>
            <span>Điều khoản sử dụng</span>
          </div>
        </div>
      </footer>

      <a className="mobile-sticky-cta" href="#booking">Đặt lịch 30 phút <span aria-hidden="true">↗</span></a>
    </main>
  );
}
