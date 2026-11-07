function Card({ children, onClick }) {
  const className = `w-full rounded-xl bg-white p-4 text-left shadow-sm ${
    onClick
      ? 'cursor-pointer transition hover:shadow-md active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
      : ''
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  return <div className={className}>{children}</div>;
}

export default Card;