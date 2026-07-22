-- แกนของ REQUIREMENTS §3.3: ผลรวมทุก leg ของ transaction ต้อง = 0
-- ใช้ deferred constraint trigger เพื่อรองรับ insert หลาย legs ในทรานแซกชันเดียว
-- (เช็คตอน commit ไม่ใช่ตอน insert แต่ละแถว)
create function check_transaction_balance()
returns trigger
language plpgsql
as $$
declare
  txn_id uuid;
  total bigint;
begin
  txn_id := coalesce(new.transaction_id, old.transaction_id);

  select coalesce(sum(amount), 0) into total
  from transaction_legs
  where transaction_id = txn_id;

  if total <> 0 then
    raise exception 'transaction % does not balance: sum of legs = %', txn_id, total;
  end if;

  return null;
end;
$$;

create constraint trigger trg_check_transaction_balance
  after insert or update or delete on transaction_legs
  deferrable initially deferred
  for each row
  execute function check_transaction_balance();
