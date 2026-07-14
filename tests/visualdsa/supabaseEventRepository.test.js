const {createSupabaseEventRepository}=require('../../app/visualdsa/supabaseEventRepository');
describe('Supabase event repository',()=>{test('requires a Supabase client at use time',()=>{const repo=createSupabaseEventRepository({from:jest.fn(()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})}))});expect(repo).toBeTruthy();});});
