-- 062. Очерёдность: реплика не раньше, чем игрок узнал то, на что она опирается.
-- Аудит /tmp/order_audit.md. Меняются только requires у правил (по id) и добавляются 2 правила
-- Валентины (R46f — нейтральная реплика на сырой пейджер до экспертизы, R46e — признание
-- на справку о пейджере). Тексты R46f/R46e — ЧЕРНОВИК: проверить автору и voice-checker, озвучки нет.
-- Без экспертизы правило «не готово»: эксперт отвечает «Пока мне не с чем это сопоставить…»,
-- человек — «Не понимаю, к чему вы клоните» (lib/graphRules.ts).
-- Повторный запуск безопасен: requires выставляются в фиксированное значение, новые правила
-- сначала удаляются по id. Проходимость проверена симулятором (см. отчёт).
begin;

-- Валентина Петровна Сартакова
--   R46: requires = «Китайский АОН у телефона Валентины и блокнот» + «Пейджер Игоря: последний сигнал в четверг» — сырой пейджер + АОН → признание: только после экспертизы пейджера
--   R09: requires = «Пейджер Игоря: последний сигнал в четверг» — СМЭ + пейджер → признание: пейджер должен пройти Сеитову/Абишева (было: сырой пейджер)
--   R238: requires = «Признание Валентины: похищение и выкуп» — после признания на СМЭ не возвращаться к «я ничего не знаю» (было: E02+E38)
--   R240: requires = «Признание Валентины: похищение и выкуп» — «его голос был в трубке» — только после её собственного признания (было: requires на саму себя)
update characters set reaction_rules = (
  select jsonb_agg(case r->>'id' when 'R46' then jsonb_set(r, '{requires}', '["e4e94374-000e-52e3-bb26-9bec42b1c55b", "7ada2011-2720-5b69-8a9c-9291fdad70e9"]'::jsonb) when 'R09' then jsonb_set(r, '{requires}', '["7ada2011-2720-5b69-8a9c-9291fdad70e9"]'::jsonb) when 'R238' then jsonb_set(r, '{requires}', '["b170d031-ba6c-5e70-829f-cbd96f761931"]'::jsonb) when 'R240' then jsonb_set(r, '{requires}', '["b170d031-ba6c-5e70-829f-cbd96f761931"]'::jsonb) else r end order by ord)
  from jsonb_array_elements(reaction_rules) with ordinality t(r, ord)
) where id = '0e8eb7cc-a947-5525-80eb-0978454d919b';

-- Юрий Николаевич Кан
--   R128: requires = «Заключение СМЭ: удушение, не угар» — «под ногтями тоже вторая» — только после вскрытия
--   R130: requires = «Заключение СМЭ: удушение, не угар» — «около десяти» — только после вскрытия
--   R131: requires = «Заключение СМЭ: удушение, не угар» — «по моему заключению около десяти» — только после вскрытия
--   R132: requires = «Заключение СМЭ: удушение, не угар» — «умер около десяти» — только после вскрытия
--   R133: requires = «Заключение СМЭ: удушение, не угар» — «с моим сходится, щетина двое суток» — только после вскрытия
--   R134: requires = «Заключение СМЭ: удушение, не угар» — «с моим заключением сходится» — только после вскрытия
--   R259: requires = «Заключение СМЭ: удушение, не угар» — «что он пережил, я вам написал» — только после вскрытия
--   R263: requires = «Заключение СМЭ: удушение, не угар» — «время смерти я вам назвал» — только после вскрытия
--   R274: requires = «Заключение СМЭ: удушение, не угар» — «видна асфиксия» — только после вскрытия
update characters set reaction_rules = (
  select jsonb_agg(case r->>'id' when 'R128' then jsonb_set(r, '{requires}', '["54bf13bc-3525-5eec-9441-609d8ee21f59"]'::jsonb) when 'R130' then jsonb_set(r, '{requires}', '["54bf13bc-3525-5eec-9441-609d8ee21f59"]'::jsonb) when 'R131' then jsonb_set(r, '{requires}', '["54bf13bc-3525-5eec-9441-609d8ee21f59"]'::jsonb) when 'R132' then jsonb_set(r, '{requires}', '["54bf13bc-3525-5eec-9441-609d8ee21f59"]'::jsonb) when 'R133' then jsonb_set(r, '{requires}', '["54bf13bc-3525-5eec-9441-609d8ee21f59"]'::jsonb) when 'R134' then jsonb_set(r, '{requires}', '["54bf13bc-3525-5eec-9441-609d8ee21f59"]'::jsonb) when 'R259' then jsonb_set(r, '{requires}', '["54bf13bc-3525-5eec-9441-609d8ee21f59"]'::jsonb) when 'R263' then jsonb_set(r, '{requires}', '["54bf13bc-3525-5eec-9441-609d8ee21f59"]'::jsonb) when 'R274' then jsonb_set(r, '{requires}', '["54bf13bc-3525-5eec-9441-609d8ee21f59"]'::jsonb) else r end order by ord)
  from jsonb_array_elements(reaction_rules) with ordinality t(r, ord)
) where id = 'a6c62ec0-5ff9-53a5-b9a2-20898741074b';

-- Олжас Бекенов
--   R41: requires = «Признание Олжаса: похищение» + «Освидетельствование: царапины от ногтей» + «Заключение СМЭ: удушение, не угар» — зачитывают «задушен около десяти» — нужно заключение Кана
update characters set reaction_rules = (
  select jsonb_agg(case r->>'id' when 'R41' then jsonb_set(r, '{requires}', '["0146fe89-1029-5d65-87bb-f750dfe7ad2d", "7d1a9a15-62a5-51f0-98d5-bf6ac0dc1ce3", "54bf13bc-3525-5eec-9441-609d8ee21f59"]'::jsonb) else r end order by ord)
  from jsonb_array_elements(reaction_rules) with ordinality t(r, ord)
) where id = 'ea6167fb-4eea-5e08-ae65-e5fce24e6a6c';

-- Виктор Гринько
--   R122: requires = «Виктор: «по четвергам он ездил один»» — «я ж говорил» про «Волгу» — только если Виктор это уже рассказал
update characters set reaction_rules = (
  select jsonb_agg(case r->>'id' when 'R122' then jsonb_set(r, '{requires}', '["c4c95f03-86b0-5820-b9f4-736453e2dbef"]'::jsonb) else r end order by ord)
  from jsonb_array_elements(reaction_rules) with ordinality t(r, ord)
) where id = '54b23338-3cf2-5d0a-99c4-91c0de226522';

-- Алия Сартакова (Жумабаева)
--   R206: requires = «Алия: в пятницу гараж был пуст» — «я вам и так сказала» — только после её показаний
update characters set reaction_rules = (
  select jsonb_agg(case r->>'id' when 'R206' then jsonb_set(r, '{requires}', '["42ea83ef-f3ad-504f-99e0-da4ecb9fe57d"]'::jsonb) else r end order by ord)
  from jsonb_array_elements(reaction_rules) with ordinality t(r, ord)
) where id = '96e916c8-7fd0-5edc-a4fe-1a6aeda231bf';

-- Валентина: новые правила на пейджер (до и после экспертизы)
update characters set reaction_rules = (select coalesce(jsonb_agg(r order by ord), '[]'::jsonb) from jsonb_array_elements(coalesce(reaction_rules, '[]'::jsonb)) with ordinality t(r, ord) where r->>'id' not in ('R46f','R46e')) || '[{"id": "R46f", "on": "1ac01ab0-e8f1-5009-9640-d18dfa4f5e44", "requires": [], "grants": [], "fallback": true, "text": "Валентина Петровна смотрит на пейджер. В руки не берёт.\n— Его. Он с ним не расставался. — Пауза. — Он в Бишкеке, по делам. Там, наверное, не ловит. — Поправляет платок. — Извините. У меня люди."}, {"id": "R46e", "on": "7ada2011-2720-5b69-8a9c-9291fdad70e9", "requires": ["e4e94374-000e-52e3-bb26-9bec42b1c55b"], "grants": ["b170d031-ba6c-5e70-829f-cbd96f761931"], "group": "group-1", "repeat_text": "«Я вам всё рассказала. Больше мне добавить нечего».", "text": "Валентина Петровна читает справку. На строке «от Сартаковой В. П.» останавливается. Смотрит на АОН. На блокнот, где цифры её почерком.\n— С четверга. Ни одного… Он не уезжал в Бишкек. — Пауза. — Это я придумала. В пятницу утром сказала Виктору по телефону: Игорь в Бишкеке, вы свободны. Он поверил. Он мне всегда верит. — Дальше коротко, как диктант диктует: — Четверг, девять вечера. Автомат. Шестьдесят тысяч, иначе внучка. С Данияром собрали сорок. Суббота, половина четвёртого, вот этот номер. Данияр отвёз деньги, вернулся. С половины восьмого до половины второго был со мной. — Кладёт пейджер. — Скажите Виктору сами. Я не смогу… Я ему в глаза не смогу."}]'::jsonb where id = '0e8eb7cc-a947-5525-80eb-0978454d919b';

-- Фархад, протокол Q3 «Где вы были в субботу вечером?»: в ответе «Я же говорил тебе… при свечке» —
-- показывать после того, как он это сказал (улика «Фархад: «сидел при свечке»»), а не только после признания Валентины.
update characters set fixed_questions = jsonb_set(fixed_questions, '{3,requires}', '["b170d031-ba6c-5e70-829f-cbd96f761931", "6d8d58c7-784b-5d25-9f9e-d6c55f6966ba"]'::jsonb)
where id = '5b4c1ece-ba00-50d6-9113-73e03e05ccd8' and fixed_questions->3->>'q' = 'Где вы были в субботу вечером?';

-- Решение автора: финал требует заключения СМЭ (тело должно пройти через Кана).
update case_accusation set required_evidence_ids = array(select distinct unnest(required_evidence_ids || array['54bf13bc-3525-5eec-9441-609d8ee21f59'::uuid]))
where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab';

commit;

-- Проверка: должно вернуть 18 строк с новыми requires
select c.name, r->>'id' as rule, r->'requires' as requires
from characters c, jsonb_array_elements(c.reaction_rules) r
where r->>'id' in ('R46','R09','R238','R240','R128','R130','R131','R132','R133','R134','R259','R263','R274','R41','R122','R206','R46f','R46e')
  and c.case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab'
order by 1, 2;
