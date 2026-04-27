import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
     <h1>khan pdf</h1>

     <Link href="/url-to-pdf" >
     <button className="cursor-pointer bg-white px-10 py-2 text-black w-4xl "> url-to-pdf </button>
     </Link>
    </div>
  );
}
